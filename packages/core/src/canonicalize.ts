/**
 * Deterministic JSON canonicalization for OpenAuthCert badges.
 *
 * THE LOAD-BEARING INVARIANT: the CLI signer, the badge server, the CI
 * validator, and the in-browser VerifyForm must all turn a badge into the
 * EXACT SAME bytes, or Ed25519 signatures will not verify across surfaces.
 *
 * This module is intentionally PURE — it imports nothing from `node:*` so it
 * can be bundled into the browser (via the `@openauthcert/core/browser`
 * subpath export) unchanged. Both Node and the browser feed the returned
 * string through UTF-8 encoding (`Buffer.from(str, 'utf8')` /
 * `new TextEncoder().encode(str)`), which produce identical bytes.
 *
 * Rules:
 *  - Object keys are sorted with the default `Array.prototype.sort`
 *    (UTF-16 code-unit order) — NOT `localeCompare`, which is locale dependent.
 *  - Arrays preserve their order.
 *  - Primitives are serialized with standard `JSON.stringify` (raw UTF-8, no
 *    `\uXXXX` ASCII escaping).
 *  - The `digital_signature` field is excluded from the signed body.
 */

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`,
  );
  return `{${entries.join(",")}}`;
}

/**
 * Produce the canonical string that is actually signed/verified: the badge
 * with its `digital_signature` field removed, canonicalized.
 */
export function canonicalBytesInput(badge: object): string {
  const { digital_signature: _signature, ...body } = badge as Record<
    string,
    unknown
  >;
  return canonicalize(body);
}
