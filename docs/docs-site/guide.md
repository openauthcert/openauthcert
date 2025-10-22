# Certification Guide

## 1. Purpose
OpenAuthCert certifies software that provides open Single Sign-On (SSO) and Identity Provider (IdP) support **without enterprise-only restrictions**.

## 2. Eligibility
A project is eligible if it:
- Implements LDAP, OIDC, or SAML in its core version.
- Publishes documentation for setup and verification.
- Offers access without a paid upgrade.

## 3. How certification works
1. **Vendor submits** a badge request (JSON or PR).
2. **Schema validation** and **digital signing** performed via GitHub Actions.
3. **Badge issued** with status `certified` or `pending`.
4. **Evidence bundle** generated and attached to the registry.
5. **Periodic compliance probes** verify that the feature remains open.
6. If compliance fails, **revocation** occurs automatically.

## 4. Badge statuses
| Status | Meaning |
|---------|----------|
| `certified` | Verified open IdP support. |
| `pending` | Awaiting manual or automated validation. |
| `revoked` | Feature removed or placed behind paywall. |
| `denied` | Not meeting core requirements. |

## 5. Where badges live
All certifications are public JSON files under `/registry/badge-registry/`.
Each file is cryptographically signed by the Foundation.
