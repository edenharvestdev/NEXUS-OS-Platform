/** NEXUS OS frontend RBAC — mirrors backend/src/lib/rbac.ts */

export const ROLES = ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] as const

export const MODULE_ACCESS: Record<string, string[]> = {
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
  return MODULE_ACCESS[module]?.includes(r) ?? false
}

export function getDefaultRoute(role?: string): string {
  const r = normalizeRole(role)
  if (r === 'admin') return '/dashboard'
  if (r === 'staff') return '/dashboard/staff'
  const order = ['mydata', 'myai', 'deptai', 'onboarding', 'memory', 'dashboard', 'people', 'finance', 'sales', 'marketing', 'meeting', 'gpt', 'guardian', 'ai', 'worklog', 'skills', 'settings']
  for (const mod of order) {
    if (canAccessModule(r, mod)) {
      if (mod === 'dashboard') return '/dashboard'
      return `/dashboard/${mod}`
    }
  }
  return '/dashboard/worklog'
}
