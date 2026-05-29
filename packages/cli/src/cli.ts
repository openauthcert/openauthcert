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

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

/**
 * Resolve a CLI value to its content. Accepts `@path` (explicit file), a bare
 * path to an existing file, or a literal key/PEM value.
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

function readBadge(path: string): Badge {
  return JSON.parse(readFileSync(path, "utf8")) as Badge;
}

function writeBadge(path: string, badge: Badge): void {
  writeFileSync(path, JSON.stringify(badge, null, 2) + "\n");
}

function cmdKeygen(): void {
  const { seedB64, publicKeyPem } = generateKeyPair();
  console.log("# OAC_PRIVATE_KEY_B64 (keep secret):");
  console.log(seedB64);
  console.log("\n# Public key (specs/badge-spec/public.pem):");
  process.stdout.write(publicKeyPem.endsWith("\n") ? publicKeyPem : publicKeyPem + "\n");
}

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
