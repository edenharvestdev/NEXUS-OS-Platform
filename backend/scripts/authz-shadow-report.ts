/**
 * AUTHZ shadow report — an easy-to-read view of who would be DENIED if the
 * least-privilege engine were enforced, plus what's been observed live.
 * Read-only; safe to run anytime. Against prod: DATABASE_URL="$PUBLIC_URL".
 *
 *   node --require ts-node/register scripts/authz-shadow-report.ts
 */
import { ROLES, MODULE_ACCESS } from '../src/lib/rbac'
import { resolveModule, resolveDataClass, roleModuleScope, DATA_CLASS_POLICY } from '../src/lib/authz'
import { canViewTier } from '../src/lib/encryption'
import { queryAll } from '../src/lib/db'

const TIERS: Array<['T2' | 'T3', 'HARD' | 'RESTRICTED']> = [['T2', 'HARD'], ['T3', 'RESTRICTED']]

function staticReport() {
  console.log('# AUTHZ Shadow Report — "would deny if enforced"\n')

  console.log('## Data-class policy (matrix)')
  for (const cls of ['BASIC', 'MEDIUM', 'HARD', 'RESTRICTED'] as const) {
    const p = DATA_CLASS_POLICY[cls]
    console.log(`  ${cls.padEnd(10)} ${Array.isArray(p.roles) ? (p.roles.join(', ') || '— (break-glass only)') : 'everyone'}  · ${p.note}`)
  }

  console.log('\n## Per-role: what becomes DENIED under least-privilege (vs today)')
  for (const role of ROLES) {
    const moduleDenied = Object.keys(MODULE_ACCESS).filter(m => {
      const reachableToday = role === 'admin' ? true : (MODULE_ACCESS[m] as string[]).includes(role)
      return reachableToday && !resolveModule({ role }, m).allowed
    })
    const dataDenied = TIERS
      .filter(([tier, cls]) => canViewTier(role, tier) && !resolveDataClass({ role }, cls).allowed)
      .map(([, cls]) => cls)
    if (!moduleDenied.length && !dataDenied.length) {
      console.log(`  ${role.padEnd(11)} — no change`)
      continue
    }
    const parts: string[] = []
    if (role === 'admin') parts.push(`module scope: '*' wildcard → ${roleModuleScope('admin').length} explicit modules`)
    if (moduleDenied.length) parts.push(`modules denied: ${moduleDenied.join(', ')}`)
    if (dataDenied.length) parts.push(`DATA denied: ${dataDenied.join(', ')}`)
    console.log(`  ${role.padEnd(11)} ${parts.join(' · ')}`)
  }
}

async function liveReport() {
  console.log('\n## Live observed (audit_log: authz.shadow_would_deny)')
  let rows: any[] = []
  try {
    rows = await queryAll(
      `SELECT actor_role, resource, COUNT(*) c FROM (
         SELECT json_extract(meta,'$.actor_role') AS actor_role, resource FROM audit_log WHERE action = 'authz.shadow_would_deny'
       ) GROUP BY actor_role, resource ORDER BY c DESC`,
      [],
    ).catch(async () => {
      // Postgres: meta is text json
      return queryAll(
        `SELECT (meta::json->>'actor_role') AS actor_role, resource, COUNT(*) c
         FROM audit_log WHERE action = 'authz.shadow_would_deny' GROUP BY 1, resource ORDER BY c DESC`,
        [],
      )
    })
  } catch (e) {
    console.log('  (could not read audit_log:', (e as Error).message, ')')
    return
  }
  if (!rows.length) { console.log('  (none yet — set AUTHZ_SHADOW=on and drive traffic)'); return }
  for (const r of rows) console.log(`  ${String(r.c).padStart(4)}x  [${r.actor_role || '?'}] ${r.resource}`)
}

async function main() {
  staticReport()
  await liveReport()
  console.log('\n## Migration / enforce risk')
  console.log('  - RESTRICTED denial hits admin + hr — break-glass issuance MUST ship before enforce, or those roles lose salary/medical view.')
  console.log('  - Dropping finance/it from HARD may hide data they rely on — confirm with business before enforce.')
  console.log('  - admin module wildcard → scoped set: any module NOT in MODULE_ACCESS becomes invisible to admin once enforced.')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
