/** NEXUS OS role-based access control */

export const ROLES = ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] as const
export type Role = typeof ROLES[number]

export const MODULE_ACCESS: Record<string, Role[]> = {
  dashboard:    ['admin'],
  staff:        ['staff'],
  people:       ['admin', 'hr'],
  finance:      ['admin', 'finance'],
  sales:        ['admin', 'sales'],
  marketing:    ['admin', 'marketing'],
  meeting:      ['admin', 'finance', 'hr', 'it', 'sales'],
  gpt:          ['admin'],
  guardian:     ['admin', 'finance', 'it'],
  ai:           ['admin', 'it'],
  settings:     ['admin', 'it'],
  worklog:      ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  skills:       ['admin', 'hr', 'it', 'staff'],
  feasibility:  ['admin'],
  audit:        ['admin', 'it', 'hr'],
  ingest:       ['admin', 'it', 'finance'],
  dictionary:   ['admin', 'it', 'hr', 'finance', 'sales', 'marketing', 'staff'],
  mydata:       ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  myai:         ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  deptai:       ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  onboarding:   ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  memory:       ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'],
  readiness:    ['admin'],
  ceo:          ['admin'],
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

export function canAccessRoute(role: string | undefined, path: string): boolean {
  if (path === '/dashboard' || path === '/dashboard/') return canAccessModule(role, 'dashboard') || normalizeRole(role) === 'staff'
  const segment = path.replace('/dashboard/', '').split('/')[0]
  return canAccessModule(role, segment)
}
