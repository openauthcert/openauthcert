# OpenAuthCert

Empowering implementers and relying parties with verifiable assurances that identity products interoperate securely.

<div class="hero-actions">
  <a class="action primary" href="/registry">Browse the badge registry</a>
  <a class="action" href="/verify">Verify a badge</a>
  <a class="action" href="/apply">Apply for certification</a>
</div>

## Why OpenAuthCert exists

- **Open governance.** Vendors, deployers, and relying parties share an independent body to review implementations.
- **Transparent criteria.** Every badge is backed by a signed JSON record and documented evidence.
- **Trustable artifacts.** Badges can be verified offline with the published public key.

## Program pillars

### Registry-first
Badges are stored in this repository so that anyone can audit version history, evidence, and revocation notes. The VitePress site renders everything statically—no servers required.

### Practical verification
Use the [verify tool](/verify) to check a badge JSON before trusting it. The registry browser exposes JSON links and evidence so you can quickly validate vendor claims.

### Inclusive participation
OpenAuthCert welcomes new vendors. Follow the [apply guide](/apply) to propose a badge, supply evidence, and monitor review.

## Get involved

- Join the discussion on [GitHub issues](https://github.com/openauthcert/openauthcert/issues).
- Review the [badge specification](/spec) and [governance policy](/governance).
- Share the [trust guidance](/trust) with your customers to embed signed evidence in documentation.

<style scoped>
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.5rem 0 2rem;
}

.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.2rem;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.action.primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}

.action:hover,
.action:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--vp-c-brand-1) 25%, transparent);
}
</style>
