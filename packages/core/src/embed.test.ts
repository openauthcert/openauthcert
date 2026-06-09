import { describe, it, expect } from "vitest";
import { statusSvgPath, statusSvgUrl, registryDeepLink } from "./embed.js";

const badge = { vendor: "acme-cloud", application: "cloud-sso", version: "1.0.0" };

describe("embed URLs", () => {
  it("builds the status SVG path", () => {
    expect(statusSvgPath(badge)).toBe("/badges/acme-cloud/cloud-sso/1.0.0.svg");
  });

  it("builds an absolute SVG URL and trims trailing slashes", () => {
    expect(statusSvgUrl(badge, "https://openauthcert.org/")).toBe(
      "https://openauthcert.org/badges/acme-cloud/cloud-sso/1.0.0.svg",
    );
  });

  it("trims many trailing slashes in linear time", () => {
    const noisy = "https://openauthcert.org" + "/".repeat(5000);
    expect(statusSvgUrl(badge, noisy)).toBe(
      "https://openauthcert.org/badges/acme-cloud/cloud-sso/1.0.0.svg",
    );
    expect(registryDeepLink(badge, noisy)).toBe(
      "https://openauthcert.org/registry?vendor=acme-cloud&app=cloud-sso",
    );
  });

  it("deep-links to the pre-filtered registry", () => {
    expect(registryDeepLink(badge)).toBe(
      "https://openauthcert.org/registry?vendor=acme-cloud&app=cloud-sso",
    );
  });

  it("encodes unusual segment characters", () => {
    expect(statusSvgPath({ vendor: "a b", application: "c/d", version: "1.0" })).toBe(
      "/badges/a%20b/c%2Fd/1.0.svg",
    );
  });
});
