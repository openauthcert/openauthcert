/**
 * Produce a deterministic canonical JSON string for `value` suitable for consistent signing and verification across environments.
 *
 * Canonicalization rules:
 * - Object keys are sorted using the default `Array.prototype.sort` (UTF-16 code-unit order).
 * - Array element order is preserved.
 * - Primitives are serialized with `JSON.stringify`.
 *
 * @returns A stable JSON string representation of `value` following the rules above.
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
 * Create the canonical JSON string used for signing and verification by removing the badge's `digital_signature` field and canonicalizing the remainder.
 *
 * @param badge - The badge object from which `digital_signature` will be excluded before canonicalization
 * @returns The deterministic canonical JSON string of the badge without its `digital_signature` field
 */
export function canonicalBytesInput(badge: object): string {
  const { digital_signature: _signature, ...body } = badge as Record<
    string,
    unknown
  >;
  return canonicalize(body);
}
