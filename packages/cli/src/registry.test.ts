import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { walkRegistry, pathConsistencyError } from "./registry.js";
import type { Badge } from "@openauthcert/core";

const badge: Badge = {
  vendor: "acme-cloud",
  application: "cloud-sso",
  version: "1.0.0",
  badge_type: "free-oidc-support",
  status: "certified",
  issued_at: "2024-05-01T12:00:00Z",
  digital_signature: "AA==",
};

describe("registry helpers", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oac-cli-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("walks nested badge files", () => {
    const dir = join(root, "acme-cloud", "cloud-sso");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "1.0.0.json"), JSON.stringify(badge));
    const entries = walkRegistry(root);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.rel).toBe(join("acme-cloud", "cloud-sso", "1.0.0.json"));
  });

  it("accepts a path whose segments match the badge", () => {
    const entry = {
      file: "x",
      rel: join("acme-cloud", "cloud-sso", "1.0.0.json"),
      badge,
    };
    expect(pathConsistencyError(entry)).toBeNull();
  });

  it("flags a flat or mismatched path", () => {
    const entry = {
      file: "x",
      rel: "acme-cloud_cloud-sso_1.0.0.json",
      badge,
    };
    expect(pathConsistencyError(entry)).toMatch(/expected nested path/);
  });
});
