---
title: Badge specification
---

<script setup lang="ts">
import schemaSource from '../../specs/badge-spec/schema-v1.json?raw'

interface BadgeSchema {
  title: string
  required: string[]
  properties: Record<string, { enum?: string[]; description?: string }>
}

const schema = JSON.parse(schemaSource) as BadgeSchema
const badgeTypes = schema.properties.badge_type?.enum ?? []
const statuses = schema.properties.status?.enum ?? []
</script>

# Badge specification

The OpenAuthCert badge schema is versioned alongside the registry. The current schema (`schema-v1.json`) defines the structure every badge must follow.

## Schema highlights

- **Title:** `{{ schema.title }}`
- **Required fields:** {{ schema.required.join(', ') }}
- **Badge types:** {{ badgeTypes.join(', ') }}
- **Status values:** {{ statuses.join(', ') }}

You can review the full JSON Schema on GitHub: [schema-v1.json](https://github.com/openauthcert/openauthcert/blob/main/specs/badge-spec/schema-v1.json).

## Canonicalization

Badges are signed using a deterministic JSON serialization:

- Keys are sorted lexicographically at every depth.
- Objects exclude the `digital_signature` field before signing.
- Arrays retain their original order.
- Numbers and booleans use standard JSON encoding with no extra whitespace.

This canonical form is what the [verify tool](/verify) reconstructs before checking the signature.

## Digital signatures

- The initiative publishes a global Ed25519 public key at [`/public_key.pem`](/public_key.pem).
- Vendors sign badge payloads with the corresponding private key after review.
- The `digital_signature` field stores a Base64-encoded Ed25519 signature over the canonical payload.
- Revocations require a new signature after updating `status` and `revoked_at`.

For implementation details, see the [`tools/tooling/sign_verify.py`](https://github.com/openauthcert/openauthcert/blob/main/tools/tooling/sign_verify.py) CLI helper.
