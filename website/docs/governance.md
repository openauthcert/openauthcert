---
title: Governance
---

# Governance

The OpenAuthCert Foundation is a vendor-neutral working group that stewards badge issuance, revocation, and evidence integrity. This page outlines the policies the community follows.

## Badge status values

- `pending` – submitted for review, not yet approved or signed.
- `certified` – approved and signed by maintainers. Evidence is current.
- `revoked` – certification withdrawn because requirements are no longer met.
- `denied` – application rejected. The submission remains in history for transparency.

In addition, a signed `certified` badge is shown as **expired** once its `expires_at` instant passes. Expiry is computed, not re-signed — exactly like a TLS certificate lapses on its own.

## Staying certified: expiry & continuous compliance

Certification is an ongoing commitment, not a one-time stamp. Three mechanisms keep the registry honest:

1. **Expiry / renewal.** Every badge carries a signed `expires_at`, set to **12 months** after issue. Past that, verifiers and the registry treat it as expired until the vendor opens a renewal PR for re-validation.
2. **Nightly compliance probe.** A scheduled job (`probe-compliance.yml`) re-tests the live endpoints declared in each badge's `checks` block — the OIDC discovery document, SAML metadata, LDAP reachability, and the public docs (scanned for paywall regressions). Results are recorded as dated evidence on the `evidence-data` branch.
3. **Automatic revocation after 3 strikes.** A per-badge failure counter persists across runs. If a certified vendor fails its checks on **three consecutive probe runs**, the probe re-signs the badge as `revoked` and opens a pull request against `main`. The three-strike gate prevents a transient outage from revoking a legitimate certification.

## Revocation triggers

Badges may be revoked — manually or automatically — when:

- The certified free feature is removed or moved behind a paywall (caught by the probe).
- Security issues invalidate previously reviewed features.
- Evidence links break or no longer demonstrate the required behavior.
- Vendors fail to address critical review findings within the agreed timeline.
- The product version is end-of-life without a supported replacement.

Revoked badges must include a `revoked_at` timestamp and a clear note describing the rationale. The card in the [registry](/registry) highlights revoked and expired entries, and embedded status badges update automatically.

## Review & approval flow

1. **Proposal** – Vendors open a pull request with the badge JSON and evidence.
2. **Probing** – Reviewers ask questions, request additional logs, or run interoperability tests.
3. **Resolution** – Vendors update the badge JSON or evidence based on findings.
4. **Approval** – A maintainer signs the canonical payload, updates `digital_signature`, and merges the change.
5. **Deployment** – The static site rebuilds after CI succeeds and publishes the new badge.

Issues, clarifications, and policy discussions happen in [GitHub Issues](https://github.com/openauthcert/openauthcert/issues). Major policy changes are proposed as pull requests for community review.

## Pre-deploy checks

Before the website deploys, CI runs:

- Registry validation: `oac validate` checks every badge's JSON Schema, Ed25519 signature, and that its file lives at `<vendor>/<application>/<version>.json`.
- Static site build.

Any failure blocks deployment until addressed.
