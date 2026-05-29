/** Fastify application factory for the OpenAuthCert badge server. */
import { timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import {
  privateKeyFromSeedB64,
  publicKeyFromPem,
  signBadge,
  verifyBadge,
  schemaErrors,
  type Badge,
} from "@openauthcert/core";
import { RegistryStore } from "./store.js";

export interface AppOptions {
  registryRoot: string;
  privateSeedB64?: string;
  publicKeyPem: string;
  adminToken?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function buildApp(opts: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });
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

  app.get("/badges", async () => {
    const items = store.listAll();
    return { count: items.length, items };
  });

  app.get<{ Params: { vendor: string; application: string } }>(
    "/badges/:vendor/:application",
    async (req) => {
      const { vendor, application } = req.params;
      const items = store.listApp(vendor, application);
      return { count: items.length, items };
    },
  );

  app.post<{ Body: Badge }>("/issue", async (req, reply) => {
    requireAdmin(req.headers.authorization);
    const signingKey = requireSigning();
    const badge = { ...req.body } as Badge;
    if (badge.status !== "certified" && badge.status !== "pending") {
      return reply
        .code(400)
        .send({ error: "status must be 'certified' or 'pending' on issue" });
    }
    if (!badge.issued_at) {
      badge.issued_at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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

  app.post<{ Body: Badge }>("/verify", async (req) => {
    return { valid: verifyBadge(req.body, pub) };
  });

  return app;
}
