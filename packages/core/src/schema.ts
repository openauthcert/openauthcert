/**
 * JSON Schema validation. The schema's single source of truth is
 * `specs/badge-spec/schema-v1.json`; `scripts/embed-schema.mjs` bundles it into
 * `badge-schema.generated.ts` at build time so this module needs no runtime
 * file access (works the same in the monorepo, in node_modules, and in Docker).
 *
 * Node-only (Ajv is a CommonJS-ish dependency). Not part of the browser bundle.
 */
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import type { ValidateFunction } from "ajv/dist/2020.js";
import { badgeSchema } from "./badge-schema.generated.js";

export { badgeSchema };

// ajv and ajv-formats are CommonJS; under NodeNext a default import can resolve
// to the module namespace, so fall back to its `.default` member.
type AjvCtor = new (opts?: Record<string, unknown>) => {
  compile: (schema: unknown) => ValidateFunction;
};
const Ajv2020 = ((Ajv2020Import as unknown as { default?: unknown }).default ??
  Ajv2020Import) as AjvCtor;
const addFormats = ((addFormatsImport as unknown as { default?: unknown })
  .default ?? addFormatsImport) as (ajv: unknown) => unknown;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

/**
 * Compiled validator. Enforces required fields, enums, and the
 * `status === "revoked" => revoked_at required` rule (declared in the schema's
 * `allOf`/if-then block).
 */
export const validateBadge: ValidateFunction = ajv.compile(badgeSchema);

/** Validate and return a human-readable error list (empty when valid). */
export function schemaErrors(badge: unknown): string[] {
  if (validateBadge(badge)) return [];
  return (validateBadge.errors ?? []).map(
    (err) => `${err.instancePath || "/"} ${err.message ?? "invalid"}`,
  );
}
