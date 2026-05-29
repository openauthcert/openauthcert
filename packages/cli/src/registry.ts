/** Helpers for walking the nested badge registry tree. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Badge } from "@openauthcert/core";

export interface RegistryEntry {
  /** Absolute path to the badge JSON file. */
  file: string;
  /** Path relative to the registry root, e.g. "acme-cloud/cloud-sso/1.0.0.json". */
  rel: string;
  badge: Badge;
}

/**
 * Collects all badge JSON files under the given registry root.
 *
 * @param root - Absolute or relative path to the registry root directory to traverse
 * @returns An array of `RegistryEntry` objects, one per discovered `*.json` badge file, containing the file's absolute path (`file`), its path relative to `root` (`rel`), and the parsed `badge` object
 */
export function walkRegistry(root: string): RegistryEntry[] {
  const out: RegistryEntry[] = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        visit(full);
      } else if (name.endsWith(".json")) {
        const badge = JSON.parse(readFileSync(full, "utf8")) as Badge;
        out.push({ file: full, rel: relative(root, full), badge });
      }
    }
  };
  visit(root);
  return out;
}

/**
 * Validate that an entry's relative path uses the shape `<vendor>/<application>/<version>.json` and that those segments match the badge's `vendor`, `application`, and `version`.
 *
 * @param entry - Registry entry whose `rel` path and parsed `badge` will be compared
 * @returns A descriptive error message for the first mismatch, or `null` if the path and badge fields are consistent
 */
export function pathConsistencyError(entry: RegistryEntry): string | null {
  const parts = entry.rel.split(sep);
  if (parts.length !== 3) {
    return `expected nested path <vendor>/<application>/<version>.json, got "${entry.rel}"`;
  }
  const [vendor, application, file] = parts as [string, string, string];
  const version = file.replace(/\.json$/, "");
  const { badge } = entry;
  if (badge.vendor !== vendor) {
    return `path vendor "${vendor}" != badge.vendor "${badge.vendor}"`;
  }
  if (badge.application !== application) {
    return `path application "${application}" != badge.application "${badge.application}"`;
  }
  if (badge.version !== version) {
    return `path version "${version}" != badge.version "${badge.version}"`;
  }
  return null;
}
