import { describe, it, expect } from "vitest";
import { canonicalize, canonicalBytesInput } from "./canonicalize.js";

describe("canonicalize", () => {
  it("sorts object keys by code-unit order", () => {
    expect(canonicalize({ b: 1, a: 2, c: 3 })).toBe('{"a":2,"b":1,"c":3}');
  });

  it("preserves array order and sorts nested object keys", () => {
    expect(canonicalize({ z: [{ y: 1, x: 2 }], a: [3, 1, 2] })).toBe(
      '{"a":[3,1,2],"z":[{"x":2,"y":1}]}',
    );
  });

  it("emits raw UTF-8 (no ASCII escaping) for non-ASCII strings", () => {
    // This is the byte-exact lock that guards cross-surface signature parity.
    expect(canonicalize({ vendor: "Café Açaí — Zürich" })).toBe(
      '{"vendor":"Café Açaí — Zürich"}',
    );
  });

  it("handles null, booleans, and numbers like JSON", () => {
    expect(canonicalize({ a: null, b: true, c: 1.5 })).toBe(
      '{"a":null,"b":true,"c":1.5}',
    );
  });

  it("drops digital_signature from the signed body", () => {
    const badge = { vendor: "x", digital_signature: "AAAA", version: "1.0.0" };
    expect(canonicalBytesInput(badge)).toBe('{"vendor":"x","version":"1.0.0"}');
  });
});
