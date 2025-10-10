import * as fs from 'fs'
import * as path from 'path'

type Badge = {
  vendor: string; application: string; version: string;
  badge_type: string; status: string; issued_at: string;
  digital_signature: string; revoked_at?: string; evidence_urls?: string[]; notes?: string;
}

const root = path.resolve(__dirname, '..', '..')
const regDir = path.join(root, 'registry', 'badge-registry')

function walk(dir: string): string[] {
  return fs.readdirSync(dir).flatMap(f=>{
    const p = path.join(dir,f)
    const s = fs.statSync(p)
    return s.isDirectory() ? walk(p) : [p]
  })
}

const seen = new Set<string>()
let bad = false

for (const p of fs.existsSync(regDir) ? walk(regDir) : []) {
  if (!p.endsWith('.json')) continue
  const raw = fs.readFileSync(p,'utf8')
  const data: Badge = JSON.parse(raw)
  const key = `${data.vendor}|${data.application}|${data.version}`
  if (seen.has(key)) { console.error(`Duplicate: ${key}`); bad = true }
  seen.add(key)
  const required = ['vendor','application','version','badge_type','status','issued_at','digital_signature']
  for (const r of required) {
    if (!(r in data)) { console.error(`Missing ${r} in ${p}`); bad = true }
  }
  const typeOk = ['free-sso-idp','free-ldap-support','free-oidc-support','free-saml-support','multi-idp-ready'].includes(data.badge_type)
  const statusOk = ['certified','pending','revoked','denied'].includes(data.status)
  if (!typeOk) { console.error(`Bad badge_type in ${p}`); bad = true }
  if (!statusOk) { console.error(`Bad status in ${p}`); bad = true }
}
if (bad) process.exit(1)
