#!/usr/bin/env node
import process from 'node:process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeBadge, type Badge, type RawBadge } from '../docs/.vitepress/registry'

const REQUIRED_FIELDS: (keyof RawBadge)[] = [
  'vendor',
  'application',
  'version',
  'badge_type',
  'status',
  'issued_at',
  'digital_signature'
]

const VALID_STATUSES = new Set<Badge['status']>(['certified', 'pending', 'revoked', 'denied'])
const VALID_TYPES = new Set<Badge['badge_type']>([
  'free-sso-idp',
  'free-ldap-support',
  'free-oidc-support',
  'free-saml-support',
  'multi-idp-ready'
])

const badges = loadBadgesFromFs()
const errors: string[] = []
const seen = new Set<string>()

for (const badge of badges) {
  const key = badge.slug
  if (seen.has(key)) {
    errors.push(`Duplicate badge found for ${key}`)
  } else {
    seen.add(key)
  }

  for (const field of REQUIRED_FIELDS) {
    const value = badge[field]
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`Missing required field "${field}" in ${key}`)
    }
  }

  if (!VALID_STATUSES.has(badge.status)) {
    errors.push(`Invalid status "${badge.status}" in ${key}`)
  }

  if (!VALID_TYPES.has(badge.badge_type)) {
    errors.push(`Invalid badge_type "${badge.badge_type}" in ${key}`)
  }

  if (badge.status === 'revoked' && !badge.revoked_at) {
    errors.push(`Revoked badge ${key} must include revoked_at`)
  }
}

if (errors.length > 0) {
  console.error('Registry validation failed:')
  for (const message of errors) {
    console.error(` - ${message}`)
  }
  process.exit(1)
}

console.log(`Registry validation passed for ${badges.length} badge(s).`)

function loadBadgesFromFs(): Badge[] {
  const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
  const registryDir = path.join(repoRoot, 'registry/badge-registry')
  const files = walk(registryDir)
  return files.map((file) => {
    const contents = readFileSync(file, 'utf8')
    const raw = JSON.parse(contents) as RawBadge
    const relative = path.relative(repoRoot, file).replace(/\\/g, '/')
    return normalizeBadge(raw, relative)
  })
}

function walk(dir: string): string[] {
  const items = readdirSync(dir, { withFileTypes: true })
  const results: string[] = []
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      results.push(...walk(fullPath))
    } else if (item.isFile() && item.name.endsWith('.json')) {
      results.push(fullPath)
    }
  }
  return results
}
