---
title: Verify a badge
---

<script setup lang="ts">
import VerifyForm from './.vitepress/theme/components/VerifyForm.vue'
</script>

# Verify a badge

Paste a badge JSON document to confirm its Ed25519 signature and make sure it matches the canonical payload in the registry. The verification runs entirely in your browser—no data is sent anywhere.

## Verify now

<VerifyForm />

::: tip Public key
The verification tool uses the program public key stored at <a href="/public_key.pem" download><code>/public_key.pem</code></a>. Copy it to integrate automated checks in your pipelines.
:::

::: details Sample badge JSON
```json
{
  "vendor": "acme-cloud",
  "application": "cloud-sso",
  "version": "1.0.0",
  "badge_type": "free-oidc-support",
  "status": "certified",
  "issued_at": "2026-05-01T12:00:00Z",
  "expires_at": "2027-05-01T12:00:00Z",
  "evidence_urls": [
    "https://id.acme.test/docs/oidc"
  ],
  "checks": {
    "oidc_discovery": "https://id.acme.test/.well-known/openid-configuration",
    "docs": "https://id.acme.test/docs/oidc"
  },
  "notes": "Initial certification release",
  "digital_signature": "/S6qUvxFgm3tPuUNSJpYtRyHTJu1t3j836knLPSmfsLllWjt+sw6AgzxxhBbXxdUOMh3GGe2ionkb53ROIxACA=="
}
```
:::

## How signature verification works

1. The badge JSON is parsed and canonicalized (keys sorted, arrays ordered as provided).
2. The `digital_signature` field is decoded from Base64.
3. The site public key is imported using the Web Crypto API.
4. The Ed25519 signature is checked against the canonical payload.
5. The result is displayed with clear success or error messages.

If you see an invalid result, compare the badge against the [registry entry](/registry) and make sure no fields were changed.
