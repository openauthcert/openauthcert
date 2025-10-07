# Certification Lifecycle

1. **Application Submitted** – Vendors open a pull request updating the vendor registry and proposing new badge JSON entries.
2. **Automated Validation** – The `validate-badges.yml` workflow enforces JSON Schema compliance and verifies cryptographic signatures.
3. **Maintainer Review** – Reviewers assess documentation, evidence, and test coverage before merging to `main`.
4. **Compliance Probes** – Nightly probes exercise OIDC, SAML, LDAP, and UI flows to ensure continued compatibility.
5. **Revocation** – Failures detected by probes trigger a tracked issue and optional automated revocation via `revoke-on-fail.yml`.

Every state transition is auditable in Git history, ensuring a tamper-evident certification record.
