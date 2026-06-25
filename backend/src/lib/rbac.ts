/** NEXUS OS role-based access control */

export const ROLES = [
  'admin', 'ceo',
  'operations', 'medical', 'dental', 'finance', 'hr', 'it',
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
  if (r === 'admin') return true
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
