/**
 * Role Hierarchy v1 — prints the authoritative role matrix straight from the
 * code (rbac.ts + authz.ts + break-glass.ts), so the doc can never drift from
 * what the system actually enforces. Read-only.
 *
 *   node --require ts-node/register scripts/role-matrix.ts
 */
import { ROLES, ROLE_HIERARCHY } from '../src/lib/rbac'
import { roleModuleScope, resolveDataClass } from '../src/lib/authz'
import { APPROVER_ROLES } from '../src/lib/break-glass'

/** Highest data class a role can read BY ROLE (RESTRICTED is always break-glass-only). */
function dataByRole(role: string): string {
  return resolveDataClass({ role }, 'HARD').allowed ? 'HARD (T2)' : 'MEDIUM (T0/T1)'
}

const TIER = (r: number) =>
  r >= 100 ? 'platform' : r >= 90 ? 'owner' : r >= 70 ? 'executive' : r >= 50 ? 'function-lead' : r >= 40 ? 'manager' : 'staff'

const sorted = [...ROLES].sort((a, b) => (ROLE_HIERARCHY[b] || 0) - (ROLE_HIERARCHY[a] || 0))

console.log('# Role Hierarchy v1 — NEXUS OS\n')
console.log('All roles can REQUEST break-glass (needs MFA step-up). RESTRICTED (T3) data is')
console.log('break-glass-only for EVERY role, including owner. Generated from code.\n')
console.log('| rank | tier | role | modules | data by role | break-glass approver |')
console.log('|---:|---|---|---:|---|:---:|')
for (const role of sorted) {
  const rank = ROLE_HIERARCHY[role] || 0
  const cells = [
    String(rank), TIER(rank), role, String(roleModuleScope(role).length), dataByRole(role),
    APPROVER_ROLES.includes(role) ? '✅' : '—',
  ]
  console.log('| ' + cells.join(' | ') + ' |')
}
console.log('\nApprovers:', APPROVER_ROLES.join(', '), '(platform_superadmin intentionally excluded).')
console.log('HARD-by-role:', sorted.filter(r => resolveDataClass({ role: r }, 'HARD').allowed).join(', '))
process.exit(0)
