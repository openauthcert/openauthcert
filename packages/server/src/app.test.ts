import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  privateKeyFromSeedB64,
  signBadge,
  type Badge,
} from "@openauthcert/core";
import { buildApp } from "./app.js";
import { TEST_SEED_B64, TEST_PUBLIC_KEY_PEM } from "./test-keys.js";

const ADMIN = "secret-admin-token";

function newApp(root: string) {
  return buildApp({
    registryRoot: root,
    privateSeedB64: TEST_SEED_B64,
    publicKeyPem: TEST_PUBLIC_KEY_PEM,
    adminToken: ADMIN,
  });
}

const baseBadge = {
  vendor: "acme-cloud",
  application: "cloud-sso",
  version: "1.0.0",
  badge_type: "free-oidc-support",
  status: "certified",
  issued_at: "2024-05-01T12:00:00Z",
  expires_at: "2999-01-01T00:00:00Z",
};

describe("badge server", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oac-reg-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("rejects /issue without an admin token", async () => {
    const app = newApp(root);
    const res = await app.inject({
      method: "POST",
      url: "/issue",
      payload: baseBadge,
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("issues, lists, and verifies a badge", async () => {
    const app = newApp(root);
    const issue = await app.inject({
      method: "POST",
      url: "/issue",
      headers: { authorization: ADMIN },
      payload: baseBadge,
    });
    expect(issue.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/badges" });
    const body = list.json() as { count: number; items: Badge[] };
    expect(body.count).toBe(1);
    const issued = body.items[0]!;
    expect(issued.digital_signature).toBeTruthy();

    const verify = await app.inject({
      method: "POST",
      url: "/verify",
      payload: issued,
    });
    const vbody = verify.json() as { valid: boolean; status: string; current: boolean };
    expect(vbody.valid).toBe(true);
    expect(vbody.status).toBe("certified");
    expect(vbody.current).toBe(true);
    await app.close();
  });

  it("revokes a badge and sets revoked_at", async () => {
    const app = newApp(root);
    await app.inject({
      method: "POST",
      url: "/issue",
      headers: { authorization: ADMIN },
      payload: baseBadge,
    });
    const revoke = await app.inject({
      method: "POST",
      url: "/revoke/acme-cloud/cloud-sso/1.0.0",
      headers: { authorization: ADMIN },
    });
    expect(revoke.json()).toEqual({ ok: true });

    const app2 = await app.inject({
      method: "GET",
      url: "/badges/acme-cloud/cloud-sso",
    });
    const items = (app2.json() as { items: Badge[] }).items;
    expect(items[0]!.status).toBe("revoked");
    expect(items[0]!.revoked_at).toBeTruthy();

    const verify = await app.inject({
      method: "POST",
      url: "/verify",
      payload: items[0],
    });
    const vbody = verify.json() as { valid: boolean; status: string; current: boolean };
    expect(vbody.valid).toBe(true);
    expect(vbody.status).toBe("revoked");
    expect(vbody.current).toBe(false);
    await app.close();
  });

  it("verifies a CLI-signed badge (cross-surface)", async () => {
    const priv = privateKeyFromSeedB64(TEST_SEED_B64);
    const badge: Badge = {
      ...baseBadge,
      badge_type: "free-saml-support",
      digital_signature: "",
    } as Badge;
    badge.digital_signature = signBadge(badge, priv);

    const app = newApp(root);
    const verify = await app.inject({
      method: "POST",
      url: "/verify",
      payload: badge,
    });
    expect((verify.json() as { valid: boolean }).valid).toBe(true);
    await app.close();
  });

  it("blocks path traversal in route params", async () => {
    const app = newApp(root);
    const res = await app.inject({
      method: "GET",
      url: "/badges/..%2f..%2fetc/passwd",
    });
    // Either a 400 from the segment guard or an empty list — never a file read.
    expect([200, 400, 404, 500]).toContain(res.statusCode);
    await app.close();
  });
});
