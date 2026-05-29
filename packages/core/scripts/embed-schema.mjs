// Generates src/badge-schema.generated.ts from the single schema source at
// specs/badge-spec/schema-v1.json, so the compiled core bundles the schema
// inline (no runtime file reads — works in node_modules, Docker, and tests).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(
  new URL("../../../specs/badge-spec/schema-v1.json", import.meta.url),
);
const outPath = fileURLToPath(
  new URL("../src/badge-schema.generated.ts", import.meta.url),
);

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const banner =
  "// AUTO-GENERATED from specs/badge-spec/schema-v1.json by scripts/embed-schema.mjs.\n" +
  "// Do not edit by hand; run `pnpm --filter @openauthcert/core build`.\n";
writeFileSync(
  outPath,
  `${banner}export const badgeSchema = ${JSON.stringify(schema, null, 2)} as const;\n`,
);
console.log(`embedded schema -> ${outPath}`);
