/** Entry point: start the badge server from environment configuration. */
import { readFileSync } from "node:fs";
import { buildApp } from "./app.js";

function loadPublicKeyPem(): string {
  const inline = process.env["OAC_PUBLIC_KEY_PEM"];
  if (inline) return inline;
  const path =
    process.env["OAC_PUBLIC_KEY_PEM_PATH"] ?? "specs/badge-spec/public.pem";
  return readFileSync(path, "utf8");
}

const app = buildApp({
  registryRoot: process.env["OAC_REGISTRY_ROOT"] ?? "registry/badge-registry",
  privateSeedB64: process.env["OAC_PRIVATE_KEY_B64"],
  publicKeyPem: loadPublicKeyPem(),
  adminToken: process.env["OAC_ADMIN_TOKEN"],
});

const port = Number(process.env["PORT"] ?? 8080);
const host = process.env["HOST"] ?? "0.0.0.0";

app
  .listen({ port, host })
  .then((addr) => console.log(`badge server listening on ${addr}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
