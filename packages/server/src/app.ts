/** Fastify application factory for the OpenAuthCert badge server. */
import { timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import {
  privateKeyFromSeedB64,
  publicKeyFromPem,
  signBadge,
  verifyBadge,
  schemaErrors,
  addMonthsIso,
  effectiveStatus,
  DEFAULT_VALIDITY_MONTHS,
  type Badge,
} from "@openauthcert/core";
import { RegistryStore } from "./store.js";

/** Current UTC instant as a badge timestamp (seconds precision, trailing Z). */
function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export interface AppOptions {
  registryRoot: string;
  privateSeedB64?: string;
  publicKeyPem: string;
  adminToken?: string;
}

/**
 * Compares two strings for equality using a timing-attack resistant (constant-time) check.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns `true` if `a` and `b` are identical and have the same length, `false` otherwise
 */
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Create a Fastify application configured as an OpenAuthCert badge server.
 *
 * The returned app exposes health, listing, issue, revoke, and verify endpoints
 * and mounts a RegistryStore at the provided registry root.
 *
 * @param opts - Configuration for the server:
 *   - `registryRoot`: filesystem path used by the registry store.
 *   - `publicKeyPem`: PEM-encoded public key used to verify badge signatures.
 *   - `privateSeedB64` (optional): base64 seed used to derive the signing key; when omitted, signing endpoints will return a 503.
 *   - `adminToken` (optional): bearer token required to access admin-protected endpoints (`/issue`, `/revoke`); when omitted those endpoints will reject authorization attempts.
 * @returns A configured Fastify instance serving the OpenAuthCert badge API
 */
export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Rate-limit every route (defends the authorization-gated /issue and /revoke
  // against brute-force/abuse). Awaited before routes are defined so the global
  // hook and the stricter per-route overrides below take effect.
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
  });

  const store = new RegistryStore(opts.registryRoot);
  const pub = publicKeyFromPem(opts.publicKeyPem);
  const priv = opts.privateSeedB64
    ? privateKeyFromSeedB64(opts.privateSeedB64)
    : null;

  const requireAdmin = (auth: string | undefined): void => {
    if (
      !opts.adminToken ||
      !auth ||
      !constantTimeEqual(auth, opts.adminToken)
    ) {
      const err = new Error("unauthorized") as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
  };

  const requireSigning = (): NonNullable<typeof priv> => {
    if (!priv) {
      const err = new Error("signing key not configured") as Error & {
        statusCode?: number;
      };
      err.statusCode = 503;
      throw err;
    }
    return priv;
  };

  app.get("/healthz", async () => ({ ok: true }));

  // Explicit per-route rate limits on the filesystem-reading endpoints (in
  // addition to the global limiter) so the protection is unambiguous.
  const readLimit = { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } };

  app.get("/badges", readLimit, async () => {
    const items = store.listAll();
    return { count: items.length, items };
  });

  app.get<{ Params: { vendor: string; application: string } }>(
    "/badges/:vendor/:application",
    readLimit,
    async (req) => {
      const { vendor, application } = req.params;
      const items = store.listApp(vendor, application);
      return { count: items.length, items };
    },
  );

  app.post<{ Body: Badge }>(
    "/issue",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
    requireAdmin(req.headers.authorization);
    const signingKey = requireSigning();
    const badge = { ...req.body } as Badge;
    if (badge.status !== "certified" && badge.status !== "pending") {
      return reply
        .code(400)
        .send({ error: "status must be 'certified' or 'pending' on issue" });
    }
    if (!badge.issued_at) badge.issued_at = nowIso();
    if (!badge.expires_at) {
      badge.expires_at = addMonthsIso(badge.issued_at, DEFAULT_VALIDITY_MONTHS);
    }
    badge.digital_signature = "";
    const errors = schemaErrors({ ...badge, digital_signature: "AA==" });
    if (errors.length) {
      return reply.code(400).send({ error: "schema", details: errors });
    }
    badge.digital_signature = signBadge(badge, signingKey);
    const path = store.write(badge);
    return reply.code(201).send({ ok: true, path });
  });

  app.post<{ Params: { vendor: string; application: string; version: string } }>(
    "/revoke/:vendor/:application/:version",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      requireAdmin(req.headers.authorization);
      const signingKey = requireSigning();
      const { vendor, application, version } = req.params;
      const badge = store.read(vendor, application, version);
      if (!badge) return reply.code(404).send({ error: "not found" });
      badge.status = "revoked";
      badge.revoked_at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      badge.digital_signature = signBadge(badge, signingKey);
      store.write(badge);
      return { ok: true };
    },
  );

  app.post<{ Body: Badge }>(
    "/verify",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req) => {
      const signatureValid = verifyBadge(req.body, pub);
      const status = effectiveStatus(req.body);
      // A badge is only "good" if the signature holds AND it currently certifies.
      return {
        valid: signatureValid,
        status,
        current: signatureValid && status === "certified",
        expires_at: req.body.expires_at,
      };
    },
  );

  return app;
}
