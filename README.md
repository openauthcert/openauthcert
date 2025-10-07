# Open Authentication Certification Initiative (OpenAuthCert)

**Public certification framework ensuring free, open, and paywall-free SSO/IdP support (LDAP, OIDC, SAML).**  
Includes specifications, registry, tooling, and automated verification — all in one transparent monorepo.

---

## Overview
OpenAuthCert verifies and certifies that software projects provide **open identity support** without hiding it behind enterprise paywalls.  
Each certification (badge) is a signed JSON document stored in this repository and verifiable using the Initiative’s public key.

### What’s inside
- **`/apps/badge-server`** — FastAPI service for issuing, signing, and verifying badges  
- **`/tools/tooling`** — CLI utilities and automation scripts  
- **`/registry/`** — public, digitally signed registry of certified vendors and applications  
- **`/specs/badge-spec`** — JSON schema for badge metadata  
- **`/docs/`** and **`/website/`** — documentation and static website (VitePress)  
- **`/.github/workflows/`** — validation, compliance, and deployment pipelines

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

## Verification
Each badge file contains a **digital signature** created by the Initiative.  
To verify a badge manually:

```bash
python tools/tooling/sign_verify.py verify registry/badge-registry/<vendor>/<app>/<version>.json public_key.pem
```

---

## Automation
- **GitHub Actions** validate every badge submission against the schema and verify its signature.  
- **Nightly compliance probes** re-check documentation availability and protocol functionality.  
- **Automatic revocation** triggers if a certified feature becomes paywalled or non-compliant.

---

## Get Involved
- Visit [openauthcert.org](https://openauthcert.org) for details.  
- Submit new certifications via pull request to `/registry/`.  
- Follow badge specification updates in `/specs/badge-spec/`.

---

© OpenAuthCert Initiative — advancing open, ethical identity access.
