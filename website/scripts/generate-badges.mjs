// Generates an embeddable status SVG for every registry badge into
// docs/public/badges/<vendor>/<application>/<version>.svg. The status is the
// *effective* status (certified flips to "expired" once expires_at passes), so
// rebuilding the site nightly keeps embedded badges current.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { effectiveStatus } from "@openauthcert/core";

const registryRoot = fileURLToPath(
  new URL("../../registry/badge-registry", import.meta.url),
);
const outRoot = fileURLToPath(new URL("../docs/public/badges", import.meta.url));

const COLORS = {
  certified: "#2ea043",
  expired: "#8b949e",
  revoked: "#cf222e",
  pending: "#bf8700",
  denied: "#cf222e",
};

function esc(s) {
  return String(s).replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c],
  );
}

function svg(status) {
  const right = status;
  const color = COLORS[status] ?? "#8b949e";
  const label = "OpenAuthCert";
  const lw = 96;
  const rw = 14 + right.length * 6.5;
  const w = Math.ceil(lw + rw);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(right)}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#33373d"/>
    <rect x="${lw}" width="${w - lw}" height="20" fill="${color}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11">
    <text x="${lw / 2}" y="14">${esc(label)}</text>
    <text x="${lw + (w - lw) / 2}" y="14">${esc(right)}</text>
  </g>
</svg>
`;
}

function walk(dir, found = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (name.endsWith(".json")) found.push(full);
  }
  return found;
}

let count = 0;
for (const file of walk(registryRoot)) {
  const badge = JSON.parse(readFileSync(file, "utf8"));
  const status = effectiveStatus(badge);
  const dir = join(outRoot, badge.vendor, badge.application);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${badge.version}.svg`), svg(status));
  count += 1;
}
console.log(`generated ${count} status badge SVG(s) -> ${outRoot}`);
