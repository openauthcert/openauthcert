# Open Authentication Certification Initiative (OpenAuthCert)

**Public certification framework ensuring free, open, and paywall-free SSO/IdP support (LDAP, OIDC, SAML).**
Specifications, a signed registry, tooling, a verification server, and a documentation + search website — one TypeScript monorepo.

---

## Overview
OpenAuthCert certifies that software projects provide **open identity support** without hiding it behind enterprise paywalls.
Each certification (badge) is an Ed25519-signed JSON document stored in this repository and verifiable with the Initiative's public key.

### Monorepo layout
- **`packages/core`** — `@openauthcert/core`: shared canonicalization, Ed25519 sign/verify, badge types, and JSON Schema validation. The pure `canonicalize` is also exported for the browser via `@openauthcert/core/browser`, so the CLI, server, CI, and the website's verifier all produce byte-identical signed bytes.
- **`packages/cli`** — the `oac` command line: `keygen`, `sign`, `verify`, `validate`, `revoke`, `probe`.
- **`packages/server`** — Fastify badge server (`/issue`, `/revoke`, `/verify`, `/badges`), deployed separately (Docker), not on Pages.
- **`registry/`** — the public registry. Badges live at `badge-registry/<vendor>/<application>/<version>.json`.
- **`specs/badge-spec`** — `schema-v1.json` (single schema source) and `public.pem` (single public-key source of truth).
- **`website/`** — VitePress site (GitHub Pages, openauthcert.org): documentation plus client-side vendor/certification search and an in-browser badge verifier.

---

## Badge Types
| Badge | Meaning |
|--------|----------|
| `free-sso-idp` | Free SSO/IdP integration (any open standard) |
| `free-ldap-support` | LDAP available in core |
| `free-oidc-support` | OpenID Connect in core |
| `free-saml-support` | SAML 2.0 in core |
| `multi-idp-ready` | Supports two or more IdP standards |

---

## Quick start
```bash
pnpm install
pnpm -r --filter "./packages/*" build   # build core, cli, server
pnpm -r --filter "./packages/*" test     # run all unit tests
```

### Working with badges
```bash
# Generate a keypair (prints OAC_PRIVATE_KEY_B64 seed + the public PEM)
pnpm --filter @openauthcert/cli exec oac keygen

# Sign a badge in place
pnpm --filter @openauthcert/cli exec oac sign \
  registry/badge-registry/acme-cloud/cloud-sso/1.0.0.json --seed-b64 @seed.b64

# Verify one badge / validate the whole registry
pnpm --filter @openauthcert/cli exec oac verify <badge.json> --pub specs/badge-spec/public.pem
pnpm --filter @openauthcert/cli exec oac validate --pub specs/badge-spec/public.pem
```
`--pub` and `--seed-b64` accept a literal value, a file path, or `@path`.

### Website
```bash
pnpm --filter openauthcert-site dev     # local dev server
pnpm --filter openauthcert-site build   # static build -> website/docs/.vitepress/dist
```
The build copies `specs/badge-spec/public.pem` into the site so the browser verifier always uses the same key that signs badges.

### Badge server (separate deployment)
```bash
docker build -f packages/server/Dockerfile -t openauthcert-server .
docker run -p 8080:8080 \
  -e OAC_PRIVATE_KEY_B64=... -e OAC_ADMIN_TOKEN=... \
  -v "$PWD/registry/badge-registry:/app/registry/badge-registry" \
  openauthcert-server
```

---

## Verification model
Badges are signed with **Ed25519**. The signed body is the badge canonicalized with recursively sorted keys, compact separators, raw UTF-8, and the `digital_signature` field removed. The same `canonicalize` implementation runs in Node and in the browser, so a badge verifies identically via the CLI, the server's `/verify` endpoint, and the website's verify form.

To verify manually:
```bash
pnpm --filter @openauthcert/cli exec oac verify \
  registry/badge-registry/<vendor>/<application>/<version>.json specs/badge-spec/public.pem
```

---

## Automation
- **`ci`** — builds and tests every package on PRs touching `packages/**`.
- **`validate-badges`** — runs `oac validate` (schema + signature + path consistency) on registry/spec PRs.
- **`deploy-website`** — validates the registry, builds VitePress, and deploys to GitHub Pages on `main`.
- **`probe-compliance`** — nightly stub evidence generation pushed to the `evidence-data` branch.
- **`revoke-on-fail`** — manual dispatch: re-signs a badge as `revoked` and commits it.

### Repository secrets
| Secret | Description |
| --- | --- |
| `OAC_PRIVATE_KEY_B64` | Base64 raw 32-byte Ed25519 seed used for signing/revocation |
| `OAC_ADMIN_TOKEN` | Bearer token gating the badge server's issue/revoke endpoints |

The Ed25519 **public** key is committed at `specs/badge-spec/public.pem` (it is not secret) and is the single source of truth for verification.

---

## Get Involved
- Visit [openauthcert.org](https://openauthcert.org).
- Submit new certifications via pull request adding `registry/badge-registry/<vendor>/<application>/<version>.json`.
- Track specification updates in `specs/badge-spec/`.

---

© OpenAuthCert Initiative — advancing open, ethical identity access.
