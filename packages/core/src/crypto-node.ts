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

/**
 * Create a Node.js Ed25519 private KeyObject from a base64-encoded 32-byte seed.
 *
 * @param seedB64 - Base64-encoded Ed25519 seed (whitespace is trimmed before decoding)
 * @returns The private `KeyObject` in PKCS#8/DER form
 * @throws Error if the decoded seed is not exactly 32 bytes
 */
export function privateKeyFromSeedB64(seedB64: string): KeyObject {
  const seed = Buffer.from(seedB64.trim(), "base64");
  if (seed.length !== 32) {
    throw new Error(`expected a 32-byte Ed25519 seed, got ${seed.length} bytes`);
  }
  const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
  return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

/**
 * Creates a Node KeyObject for a public Ed25519 key from an SPKI PEM string.
 *
 * @param pem - The public key in SPKI PEM format
 * @returns A Node `KeyObject` representing the public Ed25519 key
 */
export function publicKeyFromPem(pem: string): KeyObject {
  return createPublicKey({ key: pem, format: "pem", type: "spki" });
}

/**
 * Derives the SPKI PEM-formatted public key corresponding to the given private KeyObject.
 *
 * @param priv - The private KeyObject to derive the public key from.
 * @returns The public key as an SPKI PEM string.
 */
export function publicPemFromPrivate(priv: KeyObject): string {
  return createPublicKey(priv)
    .export({ format: "pem", type: "spki" })
    .toString();
}

/**
 * Extracts the 32-byte Ed25519 seed from a PKCS#8 private KeyObject and returns it as base64.
 *
 * @param priv - A PKCS#8 Ed25519 private KeyObject whose DER encoding contains the raw 32-byte seed as the trailing bytes
 * @returns The raw 32-byte Ed25519 seed encoded as a base64 string
 */
export function seedB64FromPrivate(priv: KeyObject): string {
  const der = priv.export({ format: "der", type: "pkcs8" });
  // The seed is the trailing 32 bytes after the fixed PKCS8 prefix.
  return der.subarray(der.length - 32).toString("base64");
}

export interface GeneratedKeyPair {
  seedB64: string;
  publicKeyPem: string;
}

/**
 * Generates a new Ed25519 key pair and returns the private seed and public key.
 *
 * @returns An object containing `seedB64` — the 32-byte Ed25519 seed encoded in base64, and `publicKeyPem` — the public key exported as an SPKI PEM string.
 */
export function generateKeyPair(): GeneratedKeyPair {
  const { privateKey } = generateKeyPairSync("ed25519");
  return {
    seedB64: seedB64FromPrivate(privateKey),
    publicKeyPem: publicPemFromPrivate(privateKey),
  };
}

/**
 * Signs the canonical serialized representation of a badge and returns the signature encoded in base64.
 *
 * @param badge - The badge object to be canonicalized and signed
 * @param priv - A Node `KeyObject` containing the private Ed25519 key used for signing
 * @returns The Ed25519 signature of the canonicalized badge, encoded as a base64 string
 */
export function signBadge(badge: object, priv: KeyObject): string {
  const message = Buffer.from(canonicalBytesInput(badge), "utf8");
  return edSign(null, message, priv).toString("base64");
}

/**
 * Validate a badge's `digital_signature` field against a public Ed25519 key.
 *
 * @param badge - Object containing badge data; must include a base64 `digital_signature` string
 * @param pub - Public `KeyObject` used to verify the signature
 * @returns `true` if a `digital_signature` is present and valid for the badge's canonicalized bytes, `false` otherwise
 */
export function verifyBadge(badge: object, pub: KeyObject): boolean {
  const signatureB64 = String(
    (badge as Record<string, unknown>)["digital_signature"] ?? "",
  );
  if (!signatureB64) return false;
  const signature = Buffer.from(signatureB64, "base64");
  const message = Buffer.from(canonicalBytesInput(badge), "utf8");
  return edVerify(null, message, pub, signature);
}
