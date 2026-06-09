/**
 * Browser entry point: ONLY the pure modules (canonicalization + types).
 * Imports nothing from `node:*`, so Vite/VitePress can bundle it. The
 * VerifyForm component imports `canonicalize` from here, guaranteeing it uses
 * the exact same algorithm as the Node signer.
 */
export * from "./canonicalize.js";
export * from "./types.js";
export * from "./status.js";
export * from "./embed.js";
