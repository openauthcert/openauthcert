---
title: Apply for certification
---

# Apply for an OpenAuthCert badge

Follow these steps to submit a badge request through a GitHub pull request. All review activity happens in the open so other vendors and deployers can learn from the process.

## 1. Prepare your badge JSON

Create a file under the repository path:

```
/registry/badge-registry/<vendor>/<application>/<version>.json
```

Each badge JSON must include:

- `vendor` – unique vendor identifier (lowercase, hyphenated preferred)
- `application` – product or deployment name
- `version` – release identifier you want certified
- `badge_type` – one of the values from the [specification](/spec)
- `status` – start with `pending` unless you already have approval
- `issued_at` – ISO8601 timestamp when the badge is proposed
- `expires_at` – ISO8601 timestamp when certification lapses (maintainers set this to **12 months** after issue when signing)
- `digital_signature` – Base64 signature created after maintainers approve the payload

Optional but recommended fields:

- `evidence_urls` – publicly accessible documentation, release notes, or audits that support the claim
- `checks` – live endpoints the [nightly compliance probe](/governance) re-tests so your certification stays honest:
  - `oidc_discovery` – your `…/.well-known/openid-configuration` URL
  - `saml_metadata` – your SAML 2.0 metadata URL
  - `ldap` – `host:port` for an LDAP endpoint (TCP reachability)
  - `docs` – the public docs page proving the feature is free
- `notes` – context for reviewers
- `revoked_at` – only if the badge is revoked (required when `status` is `revoked`)

## Keeping your certification

A badge is a point-in-time attestation, so it does not last forever:

- **Renewal** – certifications are valid for 12 months (`expires_at`). After that the badge shows as **expired** until you submit a renewal PR for re-validation.
- **Continuous checks** – a nightly probe re-tests the URLs in your `checks` block. If the certified feature disappears or moves behind a paywall for **three consecutive probe runs**, the badge is automatically re-signed as **revoked**. See [Governance](/governance).

## Show your badge

Every registry entry has an **Embed this badge** panel with copy-paste snippets. All three render the same live status image (regenerated on openauthcert.org, so it flips to *expired* or *revoked* on its own — no stale "certified" graphics on your site):

- **Markdown / HTML image** – links to your filtered registry entry:
  ```html
  <a href="https://openauthcert.org/registry?vendor=<vendor>&app=<application>"><img src="https://openauthcert.org/badges/<vendor>/<application>/<version>.svg" alt="OpenAuthCert status"></a>
  ```
- **Clickable JS widget** – drop in a placeholder + one script tag; clicking the badge opens your entry in the registry:
  ```html
  <div data-openauthcert
       data-vendor="<vendor>"
       data-application="<application>"
       data-version="<version>"></div>
  <script src="https://openauthcert.org/embed.js" async></script>
  ```

The widget makes no external calls beyond loading the badge image, sets no cookies, and does no tracking.

## 2. Add supporting evidence

Include links to documentation, conformance reports, or test vectors in the `evidence_urls` array. Self-hosted PDFs or static captures can be added under `/registry/evidence/<vendor>/<application>/<version>/` and linked from the badge JSON.

## 3. Open a pull request

1. Fork the repository and create a branch.
2. Add your badge JSON and any evidence assets.
3. Run the repository checks locally if possible (see below).
4. Submit a pull request describing the badge and evidence.

The `validate-badges.yml` workflow runs on every pull request. It validates JSON schema compliance and ensures file layout consistency.

## 4. Collaborate on review

- Respond quickly to review comments and provide clarifications.
- Update the badge JSON based on feedback—maintainers will re-run signing once approved.
- Keep evidence links working; stale links can delay approval.

## 5. Passing checks

Before the site deploys, the CI pipeline runs:

- [`validate-badges.yml`](https://github.com/openauthcert/openauthcert/blob/main/.github/workflows/validate-badges.yml)
- The website registry build check (see [Governance](/governance))

After these pass, maintainers sign the badge payload, merge the PR, and publish the updated static site.
