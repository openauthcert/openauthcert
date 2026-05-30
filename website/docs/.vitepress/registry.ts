import type { Badge as CoreBadge, EffectiveStatus } from '@openauthcert/core/browser'
import { effectiveStatus } from '@openauthcert/core/browser'

// The registry's badge type is the canonical core type plus derived UI fields.
export type Badge = CoreBadge & {
  slug?: string
  path?: string
  revoked?: boolean
  /** Lifecycle status shown to users: certified flips to "expired" past expires_at. */
  effective?: EffectiveStatus
}

type SearchParams = {
  q?: string
  vendor?: string
  app?: string
  type?: string
  status?: string
  sort?: 'newest' | 'vendor' | 'app' | 'version'
}

const files = import.meta.glob('../../../registry/badge-registry/**/*.json', { eager: true, query: '?raw', import: 'default' })

/**
 * Parse the bundled registry JSON files and produce normalized Badge objects with derived UI/navigation fields.
 *
 * Each returned Badge is populated from the parsed file content and supplemented with fallback values and derived properties such as `vendor`, `application`, `version`, `slug`, `path`, and `revoked`.
 *
 * @returns An array of normalized `Badge` objects extracted from the registry files
 */
function normalize(): Badge[] {
  const items: Badge[] = []
  for (const key of Object.keys(files)) {
    const raw = (files as Record<string, string>)[key]
    const data = JSON.parse(raw) as Badge
    const segs = key.split('/').slice(-3) // vendor/app/version.json
    const [vendor, application, vfile] = segs
    const version = vfile.replace(/\.json$/, '')
    const item: Badge = {
      ...data,
      vendor: data.vendor || vendor,
      application: data.application || application,
      version: data.version || version,
      slug: `${vendor}/${application}/${version}`,
      path: key.replace(/^\.\.\//, ''),
      revoked: data.status === 'revoked',
      effective: effectiveStatus(data)
    }
    items.push(item)
  }
  return items
}

const ALL: Badge[] = normalize()

export function getAllBadges(): Badge[] {
  return ALL.slice()
}

export function facets() {
  const vendors = new Set<string>(), apps = new Set<string>(), types = new Set<string>(), statuses = new Set<string>()
  for (const b of ALL) {
    vendors.add(b.vendor); apps.add(b.application); types.add(b.badge_type); statuses.add(b.effective || b.status)
  }
  return {
    vendors: Array.from(vendors).sort(),
    apps: Array.from(apps).sort(),
    types: Array.from(types).sort(),
    statuses: Array.from(statuses).sort()
  }
}

export function searchBadges(p: SearchParams = {}) {
  let items = getAllBadges()
  const q = (p.q || '').toLowerCase()
  if (q) {
    items = items.filter(b =>
      `${b.vendor} ${b.application} ${b.version} ${b.badge_type} ${b.effective || b.status}`.toLowerCase().includes(q)
    )
  }
  if (p.vendor) items = items.filter(b => b.vendor === p.vendor)
  if (p.app) items = items.filter(b => b.application === p.app)
  if (p.type) items = items.filter(b => b.badge_type === p.type)
  if (p.status) items = items.filter(b => (b.effective || b.status) === p.status)

  switch (p.sort) {
    case 'vendor': items.sort((a,b)=>a.vendor.localeCompare(b.vendor)); break
    case 'app': items.sort((a,b)=>a.application.localeCompare(b.application)); break
    case 'version': items.sort((a,b)=>cmpSemverDesc(a.version,b.version)); break
    default: items.sort((a,b)=>new Date(b.issued_at).getTime()-new Date(a.issued_at).getTime())
  }
  return items
}

function cmpSemverDesc(a: string, b: string) {
  const pa = a.split('.').map(n=>parseInt(n,10)||0)
  const pb = b.split('.').map(n=>parseInt(n,10)||0)
  for (let i=0;i<Math.max(pa.length,pb.length);i++) {
    const d = (pb[i]||0)-(pa[i]||0)
    if (d) return d
  }
  return 0
}
