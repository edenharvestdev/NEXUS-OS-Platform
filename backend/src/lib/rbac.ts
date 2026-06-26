/** NEXUS OS role-based access control */

export const ROLES = [
  // ROLE-1 (additive): platform/owner/security roles at the top of the hierarchy.
  // No existing user is assigned these — there is NO reassignment migration — so
  // adding them changes no live behavior (dark / forward-looking).
  'platform_superadmin', 'owner',
  'admin', 'ceo',
  'operations', 'medical', 'dental', 'finance', 'hr', 'it', 'it_security',
  'marketing', 'warehouse', 'franchise', 'sales', 'staff',
] as const
export type Role = typeof ROLES[number]

// Every role — for company-wide features available to all staff.
const ALL: Role[] = [...ROLES]

export const MODULE_ACCESS: Record<string, Role[]> = {
  home:          ALL,
  dashboard:     ['admin'],
  staff:         ['staff'],
  org:           ['admin', 'ceo', 'hr', 'it'],
  people:        ['admin', 'ceo', 'hr'],
  todos:         ALL,
  advances:      ['admin', 'ceo', 'hr', 'finance'],
  payroll:       ['admin', 'ceo', 'hr', 'finance'],
  reports:       ['admin', 'ceo', 'hr', 'finance'],
  finance:       ['admin', 'ceo', 'finance'],
  sales:         ['admin', 'ceo', 'sales'],
  marketing:     ['admin', 'ceo', 'marketing'],
  operations:    ['admin', 'ceo', 'operations'],
  medical:       ['admin', 'ceo', 'medical'],
  dental:        ['admin', 'ceo', 'dental'],
  warehouse:     ['admin', 'ceo', 'warehouse'],
  franchise:     ['admin', 'ceo', 'franchise'],
  meeting:       ['admin', 'ceo', 'finance', 'hr', 'it', 'sales', 'marketing', 'operations', 'medical', 'dental', 'warehouse', 'franchise'],
  gpt:           ['admin'],
  guardian:      ['admin', 'ceo', 'finance', 'it'],
  ai:            ['admin', 'it'],
  settings:      ['admin', 'it'],
  'user-groups': ['admin', 'it'],
  'users-admin': ['admin', 'it'],
  domain:        ['admin'],
  support:       ALL,
  worklog:       ALL,
  skills:        ALL,
  feasibility:   ['admin', 'ceo'],
  audit:         ['admin', 'ceo', 'it', 'hr'],
  ingest:        ['admin', 'it', 'finance'],
  taxonomy:      ['admin', 'it'],
  dictionary:    ALL,
  mydata:        ALL,
  myai:          ALL,
  deptai:        ALL,
  onboarding:    ALL,
  memory:        ['admin', 'it'],
  readiness:     ['admin', 'ceo'],
  ceo:           ['admin', 'ceo'],
}

// ── ROLE-1: module access for the new roles (additive, forward-looking) ───────
// `owner` ranks above ceo/admin → gets every executive module (anything ceo or
// admin can reach). `platform_superadmin` and `it_security` are PLATFORM/SECURITY
// roles, NOT business-data roles — they get security/ops modules only, never the
// business-data modules (payroll, finance, people, advances, medical, dental,
// reports), so they cannot see salary/PHI by virtue of their role. Company-wide
// (ALL) modules already include the new roles via `ALL = [...ROLES]`.
const PLATFORM_SUPERADMIN_MODULES = ['settings', 'user-groups', 'users-admin', 'audit', 'ai', 'memory', 'taxonomy', 'domain', 'guardian', 'readiness', 'ingest']
const IT_SECURITY_MODULES = ['audit', 'settings', 'guardian', 'memory', 'taxonomy', 'ai']
for (const m of Object.keys(MODULE_ACCESS)) {
  const roles = MODULE_ACCESS[m]
  if ((roles.includes('ceo') || roles.includes('admin')) && !roles.includes('owner')) roles.push('owner')
}
for (const m of PLATFORM_SUPERADMIN_MODULES) {
  if (MODULE_ACCESS[m] && !MODULE_ACCESS[m].includes('platform_superadmin')) MODULE_ACCESS[m].push('platform_superadmin')
}
for (const m of IT_SECURITY_MODULES) {
  if (MODULE_ACCESS[m] && !MODULE_ACCESS[m].includes('it_security')) MODULE_ACCESS[m].push('it_security')
}

/**
 * ROLE-1 central role hierarchy (rank). Higher = more privilege. This is the
 * documented baseline ("Role Hierarchy v1"); it is NOT an enforcement mechanism
 * by itself (access is still decided by MODULE_ACCESS + the authz data-class
 * policy). `manager` is a TIER occupied by the department-head roles, not a
 * standalone role. Used for display/ordering and future escalation checks.
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  platform_superadmin: 100, // platform operator (NOT a business-data role)
  owner: 90,                // business owner (top business authority)
  ceo: 80,
  admin: 70,                // company operational admin (legacy super-admin, being scoped down)
  hr: 60, finance: 60, it_security: 60,
  it: 50,
  // manager tier (department heads):
  operations: 40, medical: 40, dental: 40, sales: 40, marketing: 40, warehouse: 40, franchise: 40,
  staff: 10,
}

/** Numeric rank for a role (0 if unknown). */
export function roleRank(role?: string): number {
  return ROLE_HIERARCHY[normalizeRole(role)] || 0
}

const PATH_MODULE_ALIASES: Record<string, string> = {
  'my-data': 'mydata',
  'my-ai': 'myai',
  'dept-ai': 'deptai',
}

export function normalizeRole(role?: string): string {
  return (role || 'staff').toLowerCase()
}

export function canAccessModule(role: string | undefined, module: string): boolean {
  const r = normalizeRole(role)
  if (r === 'admin') {
    // Super-admin bypass #1 — observe (shadow) where least-privilege would deny.
    // Lazy-require to avoid the rbac ⇄ authz load-time cycle.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    try { const a = require('./authz'); a.shadowCheck(`canAccessModule:${module}`, true, a.resolveModule({ role: r }, module)) } catch { /* shadow only */ }
    return true
  }
  const allowed = MODULE_ACCESS[module]
  return allowed ? allowed.includes(r as Role) : false
}

export function moduleFromPath(path: string): string {
  if (path.startsWith('/dashboard/reports/')) return 'reports'
  if (path.startsWith('/dashboard/org/')) return 'org'
  if (path.startsWith('/dashboard/settings/user-groups')) return 'user-groups'
  if (path.startsWith('/dashboard/settings/users')) return 'users-admin'
  if (path.startsWith('/dashboard/settings/domain')) return 'domain'
  if (path.startsWith('/dashboard/settings')) return 'settings'
  if (path.startsWith('/dashboard/work/todos')) return 'todos'
  if (path.startsWith('/dashboard/home') || path.startsWith('/dashboard/staff')) return 'home'
  if (path.startsWith('/dashboard/hr/')) return 'advances'
  if (path.startsWith('/dashboard/support')) return 'support'
  if (path === '/dashboard' || path === '/dashboard/') return 'dashboard'
  const segment = path.replace('/dashboard/', '').split('/')[0] || 'dashboard'
  return PATH_MODULE_ALIASES[segment] || segment
}

export function canAccessRoute(role: string | undefined, path: string): boolean {
  if (path === '/dashboard' || path === '/dashboard/') {
    return canAccessModule(role, 'dashboard') || normalizeRole(role) === 'staff'
  }
  return canAccessModule(role, moduleFromPath(path))
}
