---
title: Governance
---

# Governance

The OpenAuthCert Foundation is a vendor-neutral working group that stewards badge issuance, revocation, and evidence integrity. This page outlines the policies the community follows.

## Badge status values

- `pending` – submitted for review, not yet approved or signed.
- `certified` – approved and signed by maintainers. Evidence is current.
- `revoked` – certification withdrawn because requirements are no longer met or evidence expired.
- `denied` – application rejected. The submission remains in history for transparency.

## Revocation triggers

Badges may be revoked when:

- Security issues invalidate previously reviewed features.
- Evidence links break or no longer demonstrate the required behavior.
- Vendors fail to address critical review findings within the agreed timeline.
- The product version is end-of-life without a supported replacement.

Revoked badges must include a `revoked_at` timestamp and a clear note describing the rationale. The card in the [registry](/registry) highlights revoked entries.

## Review & approval flow

1. **Proposal** – Vendors open a pull request with the badge JSON and evidence.
2. **Probing** – Reviewers ask questions, request additional logs, or run interoperability tests.
3. **Resolution** – Vendors update the badge JSON or evidence based on findings.
4. **Approval** – A maintainer signs the canonical payload, updates `digital_signature`, and merges the change.
5. **Deployment** – The static site rebuilds after CI succeeds and publishes the new badge.

Issues, clarifications, and policy discussions happen in [GitHub Issues](https://github.com/openauthcert/openauthcert/issues). Major policy changes are proposed as pull requests for community review.

## Pre-deploy checks

Before the website deploys, CI runs:

- Schema validation on badge files.
- The registry build check (`node website/scripts/check-registry-build.ts`).
- Static site build.

Any failure blocks deployment until addressed.
