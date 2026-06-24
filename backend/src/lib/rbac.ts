/** NEXUS OS role-based access control */

export const ROLES = ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] as const
export type Role = typeof ROLES[number]

export const MODULE_ACCESS: Record<string, Role[]> = {
  home:         ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  dashboard:    ['admin'],
  staff:        ['staff'],
  org:          ['admin', 'hr', 'it'],
  people:       ['admin', 'hr'],
  todos:        ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  advances:     ['admin', 'hr', 'finance'],
  payroll:      ['admin', 'hr', 'finance'],
  reports:      ['admin', 'hr', 'finance'],
  finance:      ['admin', 'finance'],
  sales:        ['admin', 'sales'],
  marketing:    ['admin', 'marketing'],
  meeting:      ['admin', 'finance', 'hr', 'it', 'sales'],
  gpt:          ['admin'],
  guardian:     ['admin', 'finance', 'it'],
  ai:           ['admin', 'it'],
  settings:     ['admin', 'it'],
  'user-groups': ['admin', 'it'],
  'users-admin': ['admin', 'it'],
  domain:       ['admin'],
  support:      ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  worklog:      ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  skills:       ['admin', 'hr', 'it', 'staff'],
  feasibility:  ['admin'],
  audit:        ['admin', 'it', 'hr'],
  ingest:       ['admin', 'it', 'finance'],
  taxonomy:     ['admin', 'it'],
  dictionary:   ['admin', 'it', 'hr', 'finance', 'sales', 'marketing', 'staff'],
  mydata:       ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  myai:         ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  deptai:       ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  onboarding:   ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  memory:       ['admin', 'it'],
  readiness:    ['admin'],
  ceo:          ['admin'],
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
