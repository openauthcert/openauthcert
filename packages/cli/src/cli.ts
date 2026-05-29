#!/usr/bin/env node
/**
 * oac — the OpenAuthCert command-line tool.
 *
 * Commands:
 *   keygen                               Generate an Ed25519 keypair.
 *   sign <badge.json> --seed-b64 <v>     Sign a badge in place.
 *   verify <badge.json> --pub <v>        Verify a badge's signature.
 *   validate [--registry <dir>] --pub <v>  Validate the whole registry.
 *   revoke <badge.json> --seed-b64 <v> [--notes <s>]  Revoke + re-sign.
 *   probe [--registry <dir>] [--out <dir>]  Generate stub compliance evidence.
 *
 * `--seed-b64` and `--pub` accept either a literal value or `@path` to read
 * the value from a file.
 */
import { parseArgs } from "node:util";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  generateKeyPair,
  privateKeyFromSeedB64,
  publicKeyFromPem,
  signBadge,
  verifyBadge,
  schemaErrors,
  type Badge,
} from "@openauthcert/core";
import { walkRegistry, pathConsistencyError } from "./registry.js";

/**
 * Write an error message to stderr and exit the process with code 1.
 *
 * @param message - The error message to display
 * @returns Does not return; the process is terminated with exit code 1
 */
function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

/**
 * Resolve a CLI string to its underlying content, allowing file indirection with a leading `@` or a plain existing file path.
 *
 * @param value - The CLI-provided string which may be `@path` (explicit file), a path to an existing file, or a literal value
 * @returns The resolved content: trimmed file contents when `value` references a file (with or without leading `@`), otherwise `value` unchanged
 */
function resolveValue(value: string): string {
  if (value.startsWith("@")) {
    return readFileSync(value.slice(1), "utf8").trim();
  }
  if (existsSync(value)) {
    return readFileSync(value, "utf8").trim();
  }
  return value;
}

/**
 * Load and parse a badge JSON file into a `Badge` object.
 *
 * @param path - Filesystem path to the badge JSON file
 * @returns The parsed `Badge`
 */
function readBadge(path: string): Badge {
  return JSON.parse(readFileSync(path, "utf8")) as Badge;
}

/**
 * Write a Badge object to disk as pretty-printed JSON with a trailing newline.
 *
 * @param path - Filesystem path where the badge JSON will be written
 * @param badge - The Badge object to serialize and save
 */
function writeBadge(path: string, badge: Badge): void {
  writeFileSync(path, JSON.stringify(badge, null, 2) + "\n");
}

/**
 * Generates an Ed25519 key pair and writes the private seed and public key PEM to stdout.
 *
 * Prints a labeled private seed section (intended to be kept secret) and a labeled public key PEM
 * suitable for use as specs/badge-spec/public.pem; the public key output is ensured to end with a newline.
 */
function cmdKeygen(): void {
  const { seedB64, publicKeyPem } = generateKeyPair();
  console.log("# OAC_PRIVATE_KEY_B64 (keep secret):");
  console.log(seedB64);
  console.log("\n# Public key (specs/badge-spec/public.pem):");
  process.stdout.write(publicKeyPem.endsWith("\n") ? publicKeyPem : publicKeyPem + "\n");
}

/**
 * Signs a badge JSON file using an Ed25519 seed and updates the file with the resulting digital signature.
 *
 * Validates the badge structure (using a temporary placeholder signature) before signing; on success the badge file is overwritten with an updated `digital_signature` and a log message is printed. Exits the process with an error if the badge path is missing, `--seed-b64` is not provided, or the badge fails schema validation.
 *
 * @param positionals - Command positional arguments; `positionals[0]` is the path to the badge JSON file to sign
 * @param values - Parsed CLI option values; must include `seed-b64` as a string or `@file` reference
 */
function cmdSign(positionals: string[], values: Record<string, unknown>): void {
  const badgePath = positionals[0] ?? fail("sign requires a <badge.json> path");
  const seed = values["seed-b64"];
  if (typeof seed !== "string") fail("sign requires --seed-b64 <value|@file>");
  const badge = readBadge(badgePath);
  // Validate the body with a placeholder signature, since the real one is set below.
  const errors = schemaErrors({ ...badge, digital_signature: "AA==" });
  if (errors.length) fail(`badge fails schema:\n  ${errors.join("\n  ")}`);
  const priv = privateKeyFromSeedB64(resolveValue(seed as string));
  badge.digital_signature = signBadge(badge, priv);
  writeBadge(badgePath, badge);
  console.log(`signed ${badgePath}`);
}

/**
 * Verifies the digital signature of a badge JSON file and reports whether it is valid.
 *
 * Reads the badge at the first positional path, loads a public key from `values["pub"]`
 * (either a PEM string or an `@` file reference), and checks the badge signature.
 * On success prints `valid`. On signature failure prints `invalid` and exits the process with code 1.
 *
 * @param positionals - Positional arguments; `positionals[0]` must be the path to the badge JSON file.
 * @param values - Parsed option values; must include `pub` as a PEM string or `@<path>` reference to a PEM.
 */
function cmdVerify(positionals: string[], values: Record<string, unknown>): void {
  const badgePath = positionals[0] ?? fail("verify requires a <badge.json> path");
  const pubVal = values["pub"];
  if (typeof pubVal !== "string") fail("verify requires --pub <pem|@file>");
  const pub = publicKeyFromPem(resolveValue(pubVal as string));
  const badge = readBadge(badgePath);
  if (verifyBadge(badge, pub)) {
    console.log("valid");
  } else {
    console.log("invalid");
    process.exit(1);
  }
}

/**
 * Validates all badges in a registry for schema, path consistency, and signature correctness.
 *
 * Loads the public key from `--pub`, walks the registry directory (default "registry/badge-registry" or `--registry`),
 * and for each entry records path consistency errors, schema validation errors, and signature failures.
 * If any problems are found, prints a summary to stderr and terminates the process with exit code 1.
 * On success, prints a one-line success message to stdout.
 *
 * @param values - Parsed CLI option values; expects `values["pub"]` (PEM string or `@file`) and optional `values["registry"]`.
 */
function cmdValidate(values: Record<string, unknown>): void {
  const registry =
    (values["registry"] as string | undefined) ?? "registry/badge-registry";
  const pubVal = values["pub"];
  if (typeof pubVal !== "string") fail("validate requires --pub <pem|@file>");
  const pub = publicKeyFromPem(resolveValue(pubVal as string));

  if (!existsSync(registry)) fail(`registry directory not found: ${registry}`);
  const entries = walkRegistry(registry);
  const problems: string[] = [];

  for (const entry of entries) {
    const pathErr = pathConsistencyError(entry);
    if (pathErr) problems.push(`${entry.rel}: ${pathErr}`);
    const errors = schemaErrors(entry.badge);
    for (const e of errors) problems.push(`${entry.rel}: schema ${e}`);
    if (errors.length === 0 && !verifyBadge(entry.badge, pub)) {
      problems.push(`${entry.rel}: signature invalid`);
    }
  }

  if (problems.length) {
    console.error(`✗ ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`✓ ${entries.length} badge(s) valid`);
}

/**
 * Revoke a badge JSON file by marking it revoked, adding a timestamp and optional notes, re-signing it, and writing it back.
 *
 * @param positionals - Command positional arguments; `positionals[0]` must be the path to the badge JSON to revoke.
 * @param values - Parsed option values; must include `seed-b64` (a seed value or `@`-file reference) and may include `notes` as a string.
 */
function cmdRevoke(positionals: string[], values: Record<string, unknown>): void {
  const badgePath = positionals[0] ?? fail("revoke requires a <badge.json> path");
  const seed = values["seed-b64"];
  if (typeof seed !== "string") fail("revoke requires --seed-b64 <value|@file>");
  const badge = readBadge(badgePath);
  badge.status = "revoked";
  badge.revoked_at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const notes = values["notes"];
  if (typeof notes === "string") badge.notes = notes;
  const priv = privateKeyFromSeedB64(resolveValue(seed as string));
  badge.digital_signature = signBadge(badge, priv);
  writeBadge(badgePath, badge);
  console.log(`revoked ${badgePath}`);
}

/**
 * Generate dated stub evidence summaries for all certified badges in a registry.
 *
 * Writes a `summary.json` file (stub payload) for each badge whose `status` is
 * `"certified"` into a directory structured as
 * `<out>/<vendor>/<application>/<version>/<YYYYMMDD>/summary.json`.
 *
 * The `values` map may include:
 * - `registry`: path to the badge registry (defaults to `"registry/badge-registry"`).
 * - `out`: base output directory for evidence (defaults to `"registry/evidence"`).
 *
 * @param values - Parsed CLI option values; recognizes `registry` and `out` string keys
 */
function cmdProbe(values: Record<string, unknown>): void {
  const registry =
    (values["registry"] as string | undefined) ?? "registry/badge-registry";
  const out = (values["out"] as string | undefined) ?? "registry/evidence";
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let count = 0;
  for (const { badge } of walkRegistry(registry)) {
    if (badge.status !== "certified") continue;
    const dir = join(out, badge.vendor, badge.application, badge.version, day);
    mkdirSync(dir, { recursive: true });
    const summary = {
      vendor: badge.vendor,
      application: badge.application,
      version: badge.version,
      timestamp: new Date().toISOString(),
      http: { documentation: 200 },
      oidc: { well_known: true, auth_code_flow: "stub" },
      saml: { metadata: "stub" },
      ldap: { starttls: "stub" },
      ui: { paywall_detected: false },
      result: "pass",
    };
    writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    count += 1;
  }
  console.log(`generated stub evidence for ${count} certified badge(s)`);
}

/**
 * Parse command-line arguments and invoke the matching command handler.
 *
 * This function reads CLI arguments, supports positionals, recognizes the commands
 * `keygen`, `sign`, `verify`, `validate`, `revoke`, and `probe`, and forwards
 * parsed positionals and option values to the corresponding handler.
 *
 * Supported option names: `--seed-b64`, `--pub`, `--registry`, `--out`, and `--notes`.
 * If the command is not one of the recognized names, the process is terminated via `fail`.
 */
function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      "seed-b64": { type: "string" },
      pub: { type: "string" },
      registry: { type: "string" },
      out: { type: "string" },
      notes: { type: "string" },
    },
  });

  switch (command) {
    case "keygen":
      return cmdKeygen();
    case "sign":
      return cmdSign(positionals, values);
    case "verify":
      return cmdVerify(positionals, values);
    case "validate":
      return cmdValidate(values);
    case "revoke":
      return cmdRevoke(positionals, values);
    case "probe":
      return cmdProbe(values);
    default:
      fail(`unknown command "${command ?? ""}". See the header of cli.ts for usage.`);
  }
}

main();
