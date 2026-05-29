// Copies the single source-of-truth public key into the site's public assets
// so VerifyForm and the /public_key.pem download always match what signs badges.
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(
  new URL("../../specs/badge-spec/public.pem", import.meta.url),
);
const destDir = fileURLToPath(new URL("../docs/public", import.meta.url));
const dest = fileURLToPath(
  new URL("../docs/public/public_key.pem", import.meta.url),
);

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`synced public key -> ${dest}`);
