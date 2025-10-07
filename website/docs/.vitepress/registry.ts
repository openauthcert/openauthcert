export interface Badge {
  vendor: string
  application: string
  version: string
  badge_type: string
  status: 'certified' | 'pending' | 'revoked' | 'denied'
  issued_at: string
  revoked_at?: string
  evidence_urls?: string[]
  notes?: string
  digital_signature: string
  slug: string
  path: string
  revoked: boolean
}

export type RawBadge = Omit<Badge, 'slug' | 'path' | 'revoked'>

type GlobModule = { default: RawBadge }

type BadgeEntry = { path: string; badge: RawBadge }

const hasGlob = typeof (import.meta as any).glob === 'function'

const modules = hasGlob
  ? (import.meta as any).glob<GlobModule>(
      '../../registry/badge-registry/**/*.json',
      { eager: true }
    )
  : {}

const entries: BadgeEntry[] = hasGlob
  ? Object.entries(modules).map(([key, mod]) => ({
      path: normalizePath(key),
      badge: mod.default
    }))
  : []

const data: Badge[] = hasGlob
  ? entries.map(({ path, badge }) => normalizeBadge(badge, path))
  : []

data.sort((a, b) => (a.issued_at < b.issued_at ? 1 : a.issued_at > b.issued_at ? -1 : 0))

export const getAllBadges = (): Badge[] => [...data]

export interface SearchParams {
  q?: string
  vendor?: string
  app?: string
  type?: string
  status?: string
}

export const searchBadges = (params: SearchParams = {}): Badge[] => {
  const query = params.q?.trim().toLowerCase()
  return data.filter((badge) => {
    if (query) {
      const haystack = [
        badge.vendor,
        badge.application,
        badge.version,
        badge.badge_type,
        badge.status,
        badge.notes ?? ''
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }

    if (params.vendor && badge.vendor !== params.vendor) return false
    if (params.app && badge.application !== params.app) return false
    if (params.type && badge.badge_type !== params.type) return false
    if (params.status && badge.status !== params.status) return false
    return true
  })
}

const uniqueSorted = (values: string[]): string[] => Array.from(new Set(values)).sort()

export const facets = () => ({
  vendors: uniqueSorted(data.map((badge) => badge.vendor)),
  apps: uniqueSorted(data.map((badge) => badge.application)),
  types: uniqueSorted(data.map((badge) => badge.badge_type)),
  statuses: uniqueSorted(data.map((badge) => badge.status))
})

export const normalizeBadge = (badge: RawBadge, path: string): Badge => ({
  ...badge,
  slug: `${badge.vendor}/${badge.application}/${badge.version}`,
  path,
  revoked: badge.status === 'revoked'
})

function normalizePath(key: string): string {
  return key
    .replace(/^\.\.\//, '')
    .replace(/^docs\//, '')
    .replace(/^website\//, '')
}
