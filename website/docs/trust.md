---
title: Trust model
---

# Trust model

OpenAuthCert badges are designed to be portable proof objects. Vendors can embed them in documentation, customers can verify them offline, and the community can audit every change.

## Signature model

- Badges are signed with **Ed25519**, providing strong security with a compact key size.
- The canonical payload excludes the `digital_signature` field and is serialized with sorted keys.
- The public key is published at <a href="/public_key.pem" download><code>/public_key.pem</code></a> for anyone to use.
- Signatures are verified using the same algorithm in browsers (Web Crypto) and in tooling.

## Verifying badges on the command line

The repository includes the `oac` CLI (`packages/cli`) for signing and verification:

```bash
node packages/cli/dist/cli.js verify \
  registry/badge-registry/acme-cloud/cloud-sso/1.0.0.json \
  --pub specs/badge-spec/public.pem
```

It reads the badge, canonicalizes it with the shared `@openauthcert/core` algorithm, and verifies the signature against the PEM key — the exact same canonicalization the browser verifier uses. Use it as a reference for your own automation.

## Embedding badges with JSON-LD

Vendors can publish a signed badge on their sites using JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "OpenAuthCert badge",
  "url": "https://vendor.example.com/security/badges/cloud-sso",
  "identifier": {
    "@type": "PropertyValue",
    "name": "OpenAuthCert",
    "value": "acme-cloud/cloud-sso/1.0.0"
  },
  "subjectOf": {
    "@type": "Dataset",
    "name": "Badge payload",
    "distribution": {
      "@type": "DataDownload",
      "encodingFormat": "application/json",
      "contentUrl": "https://openauthcert.org/registry/badge-registry/acme-cloud/cloud-sso/1.0.0.json"
    }
  }
}
```

Publish the JSON-LD snippet on a page and link directly to the badge JSON in the registry. Encourage customers to use the [verify tool](/verify) before relying on any badge.
