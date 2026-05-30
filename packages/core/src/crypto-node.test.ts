import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import {
  generateKeyPair,
  privateKeyFromSeedB64,
  publicKeyFromPem,
  publicPemFromPrivate,
  signBadge,
  verifyBadge,
} from "./crypto-node.js";
import { canonicalBytesInput } from "./canonicalize.js";
import type { Badge } from "./types.js";

const sampleBadge: Badge = {
  vendor: "acme-cloud",
  application: "cloud-sso",
  version: "1.0.0",
  badge_type: "free-oidc-support",
  status: "certified",
  issued_at: "2024-05-01T12:00:00Z",
  expires_at: "2025-05-01T12:00:00Z",
  evidence_urls: ["https://id.acme.test/docs/oidc"],
  notes: "Initial certification — Zürich région",
  digital_signature: "",
};

describe("Ed25519 sign/verify", () => {
  it("round-trips with a generated keypair via raw seed", () => {
    const { seedB64, publicKeyPem } = generateKeyPair();
    const priv = privateKeyFromSeedB64(seedB64);
    const pub = publicKeyFromPem(publicKeyPem);

    const badge = { ...sampleBadge };
    badge.digital_signature = signBadge(badge, priv);

    expect(verifyBadge(badge, pub)).toBe(true);
  });

  it("public key derived from seed matches the generated PEM", () => {
    const { seedB64, publicKeyPem } = generateKeyPair();
    const derived = publicPemFromPrivate(privateKeyFromSeedB64(seedB64));
    expect(derived.trim()).toBe(publicKeyPem.trim());
  });

  it("rejects a tampered badge", () => {
    const { seedB64, publicKeyPem } = generateKeyPair();
    const priv = privateKeyFromSeedB64(seedB64);
    const pub = publicKeyFromPem(publicKeyPem);

    const badge = { ...sampleBadge };
    badge.digital_signature = signBadge(badge, priv);
    badge.notes = "tampered";

    expect(verifyBadge(badge, pub)).toBe(false);
  });

  it("verifies a Node-signed badge using Web Crypto (browser parity)", async () => {
    // Proves the browser VerifyForm path (subtle.verify over the same canonical
    // bytes and SPKI PEM) accepts a signature produced by the Node signer.
    const { seedB64, publicKeyPem } = generateKeyPair();
    const priv = privateKeyFromSeedB64(seedB64);

    const badge = { ...sampleBadge };
    badge.digital_signature = signBadge(badge, priv);

    const spkiDer = pemToDer(publicKeyPem);
    const key = await webcrypto.subtle.importKey(
      "spki",
      spkiDer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const message = new TextEncoder().encode(canonicalBytesInput(badge));
    const signature = Uint8Array.from(
      Buffer.from(badge.digital_signature, "base64"),
    );

    const ok = await webcrypto.subtle.verify("Ed25519", key, signature, message);
    expect(ok).toBe(true);
  });
});

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(Buffer.from(body, "base64"));
}
