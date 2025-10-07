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
The verification tool uses the program public key stored at [`/public_key.pem`](/public_key.pem). Copy it to integrate automated checks in your pipelines.
:::

::: details Sample badge JSON
```json
{
  "vendor": "acme-cloud",
  "application": "cloud-sso",
  "version": "1.0.0",
  "badge_type": "free-oidc-support",
  "status": "certified",
  "issued_at": "2024-05-01T12:00:00Z",
  "notes": "Initial certification release",
  "evidence_urls": [
    "https://id.acme.test/docs/oidc"
  ],
  "digital_signature": "2x1YhMCtjK5Vr5yiPTb55LnmBf+Z2k44PXnbEHCZMToREOmFNVhiadwnxTS25B2pnvFy4F0Oreeyhh+LWjO+Cw=="
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
