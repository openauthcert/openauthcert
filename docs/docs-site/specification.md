# Badge Specification

All badges follow the JSON schema in `/specs/badge-spec/schema-v1.json`.

### Required fields
- `vendor`
- `application`
- `version`
- `badge_type`
- `status`
- `issued_at`
- `digital_signature`

### Optional fields
- `revoked_at`
- `evidence_urls`
- `notes`

### Digital signature
- Algorithm: Ed25519
- Canonical JSON: sorted keys, separators (",", ":")
- Signature format: Base64 encoded

### Example
```json
{
  "vendor": "Nextcloud GmbH",
  "application": "Nextcloud Server",
  "version": "28.0.1",
  "badge_type": "free-oidc-support",
  "status": "certified",
  "issued_at": "2025-10-07T12:00:00Z",
  "digital_signature": "BASE64..."
}
