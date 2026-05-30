import { describe, it, expect } from "vitest";
import {
  isExpired,
  effectiveStatus,
  isCurrentlyCertified,
  addMonthsIso,
} from "./status.js";

const base = {
  status: "certified" as const,
  issued_at: "2024-05-01T12:00:00Z",
  expires_at: "2025-05-01T12:00:00Z",
};

const before = Date.parse("2024-06-01T00:00:00Z");
const after = Date.parse("2025-06-01T00:00:00Z");

describe("certification lifecycle", () => {
  it("detects expiry by instant", () => {
    expect(isExpired(base, before)).toBe(false);
    expect(isExpired(base, after)).toBe(true);
  });

  it("reports certified before expiry, expired after", () => {
    expect(effectiveStatus(base, before)).toBe("certified");
    expect(effectiveStatus(base, after)).toBe("expired");
  });

  it("revocation outranks expiry", () => {
    const revoked = { ...base, status: "revoked" as const, revoked_at: "x" };
    expect(effectiveStatus(revoked, after)).toBe("revoked");
    expect(effectiveStatus(revoked, before)).toBe("revoked");
  });

  it("passes through pending/denied unchanged", () => {
    expect(effectiveStatus({ ...base, status: "pending" }, after)).toBe("pending");
    expect(effectiveStatus({ ...base, status: "denied" }, before)).toBe("denied");
  });

  it("isCurrentlyCertified only when certified and unexpired", () => {
    expect(isCurrentlyCertified(base, before)).toBe(true);
    expect(isCurrentlyCertified(base, after)).toBe(false);
  });

  it("adds months in UTC with trailing Z", () => {
    expect(addMonthsIso("2024-05-01T12:00:00Z", 12)).toBe("2025-05-01T12:00:00Z");
  });

  it("clamps to month end instead of overflowing", () => {
    expect(addMonthsIso("2021-01-31T12:00:00Z", 1)).toBe("2021-02-28T12:00:00Z");
    expect(addMonthsIso("2020-01-31T12:00:00Z", 1)).toBe("2020-02-29T12:00:00Z");
  });

  it("fails closed for missing or unparseable expiry", () => {
    expect(isExpired({ expires_at: "" })).toBe(true);
    expect(isExpired({ expires_at: "not-a-date" })).toBe(true);
    expect(
      effectiveStatus({ status: "certified", expires_at: "garbage" }, before),
    ).toBe("expired");
  });
});
