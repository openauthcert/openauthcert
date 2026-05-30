import { describe, it, expect } from "vitest";
import {
  probeBadge,
  updateState,
  type Fetcher,
  type TcpProbe,
  type ProbeState,
  type BadgeProbeResult,
} from "./probe.js";
import type { Badge } from "@openauthcert/core";

function badge(checks: Badge["checks"]): Badge {
  return {
    vendor: "acme-cloud",
    application: "cloud-sso",
    version: "1.0.0",
    badge_type: "free-oidc-support",
    status: "certified",
    issued_at: "2026-01-01T00:00:00Z",
    expires_at: "2027-01-01T00:00:00Z",
    checks,
    digital_signature: "AA==",
  };
}

const okFetcher: Fetcher = async (url) => {
  if (url.includes("openid-configuration")) {
    return { status: 200, text: '{"issuer":"x","authorization_endpoint":"y"}' };
  }
  return { status: 200, text: "free and open docs" };
};
const tcpOk: TcpProbe = async () => true;

describe("probeBadge", () => {
  it("passes when all declared checks succeed", async () => {
    const r = await probeBadge(
      badge({ oidc_discovery: "https://x/.well-known/openid-configuration", docs: "https://x/docs" }),
      { fetcher: okFetcher, tcp: tcpOk },
    );
    expect(r.result).toBe("pass");
    expect(r.checks.map((c) => c.name).sort()).toEqual(["docs", "oidc"]);
  });

  it("skips when no checks are declared", async () => {
    const r = await probeBadge(badge(undefined), { fetcher: okFetcher });
    expect(r.result).toBe("skip");
    expect(r.checks).toHaveLength(0);
  });

  it("fails on a non-200 oidc discovery", async () => {
    const r = await probeBadge(
      badge({ oidc_discovery: "https://x/.well-known/openid-configuration" }),
      { fetcher: async () => ({ status: 404, text: "" }) },
    );
    expect(r.result).toBe("fail");
  });

  it("fails when docs show paywall language", async () => {
    const r = await probeBadge(badge({ docs: "https://x/docs" }), {
      fetcher: async () => ({ status: 200, text: "Please upgrade to the Enterprise plan" }),
    });
    expect(r.result).toBe("fail");
    expect(r.checks[0]!.detail).toMatch(/paywall/i);
  });

  it("fails on a thrown network error", async () => {
    const r = await probeBadge(badge({ docs: "https://x/docs" }), {
      fetcher: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    expect(r.result).toBe("fail");
  });
});

describe("updateState", () => {
  const result = (res: BadgeProbeResult["result"]): BadgeProbeResult => ({
    slug: "acme-cloud/cloud-sso/1.0.0",
    vendor: "acme-cloud",
    application: "cloud-sso",
    version: "1.0.0",
    timestamp: "2026-01-01T00:00:00Z",
    checks: [],
    result: res,
  });

  it("increments on consecutive failures and resets on pass", () => {
    const state: ProbeState = {};
    expect(updateState(state, result("fail")).consecutiveFailures).toBe(1);
    expect(updateState(state, result("fail")).consecutiveFailures).toBe(2);
    expect(updateState(state, result("fail")).consecutiveFailures).toBe(3);
    expect(updateState(state, result("pass")).consecutiveFailures).toBe(0);
  });

  it("treats skip as a reset (not a failure)", () => {
    const state: ProbeState = { "acme-cloud/cloud-sso/1.0.0": { consecutiveFailures: 2, lastResult: "fail", lastChecked: "" } };
    expect(updateState(state, result("skip")).consecutiveFailures).toBe(0);
  });
});
