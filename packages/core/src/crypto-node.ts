/**
 * Ed25519 signing/verification on Node, reusing the shared canonicalization.
 *
 * The Initiative's private key is distributed as a raw 32-byte Ed25519 seed,
 * base64-encoded (the `OAC_PRIVATE_KEY_B64` secret). `node:crypto`, however,
 * only builds Ed25519 KeyObjects from PKCS8 (private) / SPKI (public) DER, so
 * we wrap the raw seed in the fixed RFC 8410 PKCS8 prefix.
 *
 * Node-only module — never import from the browser bundle.
 */
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as edSign,
  verify as edVerify,
  type KeyObject,
} from "node:crypto";
import { canonicalBytesInput } from "./canonicalize.js";

// PKCS8 prefix for an Ed25519 private key (RFC 8410). The 32-byte seed follows.
// SEQ { INT 0, SEQ { OID 1.3.101.112 }, OCTET STRING { OCTET STRING(seed) } }
const PKCS8_ED25519_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);

/** Build an Ed25519 private KeyObject from a base64 raw 32-byte seed. */
export function privateKeyFromSeedB64(seedB64: string): KeyObject {
  const seed = Buffer.from(seedB64.trim(), "base64");
  if (seed.length !== 32) {
    throw new Error(`expected a 32-byte Ed25519 seed, got ${seed.length} bytes`);
  }
  const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
  return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

/** Load an Ed25519 public KeyObject from a SPKI PEM string. */
export function publicKeyFromPem(pem: string): KeyObject {
  return createPublicKey({ key: pem, format: "pem", type: "spki" });
}

/** Derive the SPKI PEM public key from a private key — guarantees the two match. */
export function publicPemFromPrivate(priv: KeyObject): string {
  return createPublicKey(priv)
    .export({ format: "pem", type: "spki" })
    .toString();
}

/** Recover the raw 32-byte seed (base64) from a private KeyObject. */
export function seedB64FromPrivate(priv: KeyObject): string {
  const der = priv.export({ format: "der", type: "pkcs8" });
  // The seed is the trailing 32 bytes after the fixed PKCS8 prefix.
  return der.subarray(der.length - 32).toString("base64");
}

export interface GeneratedKeyPair {
  seedB64: string;
  publicKeyPem: string;
}

/** Generate a fresh Ed25519 keypair as (seed base64, SPKI PEM). */
export function generateKeyPair(): GeneratedKeyPair {
  const { privateKey } = generateKeyPairSync("ed25519");
  return {
    seedB64: seedB64FromPrivate(privateKey),
    publicKeyPem: publicPemFromPrivate(privateKey),
  };
}

/** Sign a badge body, returning the base64 signature (algorithm is null for Ed25519). */
export function signBadge(badge: object, priv: KeyObject): string {
  const message = Buffer.from(canonicalBytesInput(badge), "utf8");
  return edSign(null, message, priv).toString("base64");
}

/** Verify a badge's `digital_signature` against a public key. */
export function verifyBadge(badge: object, pub: KeyObject): boolean {
  const signatureB64 = String(
    (badge as Record<string, unknown>)["digital_signature"] ?? "",
  );
  if (!signatureB64) return false;
  const signature = Buffer.from(signatureB64, "base64");
  const message = Buffer.from(canonicalBytesInput(badge), "utf8");
  return edVerify(null, message, pub, signature);
}
