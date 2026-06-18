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

export function normalizeRole(role?: string): string {
  return (role || 'staff').toLowerCase()
}

export function canAccessModule(role: string | undefined, module: string): boolean {
  const r = normalizeRole(role)
  if (r === 'admin') return true
  return MODULE_ACCESS[module]?.includes(r) ?? false
}

/** Best landing page after login — dept-first for non-admin users */
export function getDefaultRoute(role?: string): string {
  const r = normalizeRole(role)
  if (r === 'admin') return '/dashboard/readiness'
  if (r === 'staff') return '/dashboard/staff'
  const deptHome: Record<string, string> = {
    finance: '/dashboard/finance',
    sales: '/dashboard/sales',
    marketing: '/dashboard/marketing',
    hr: '/dashboard/people',
    it: '/dashboard/ai',
  }
  if (deptHome[r]) return deptHome[r]
  if (canAccessModule(r, 'mydata')) return '/dashboard/my-data'
  return '/dashboard/worklog'
}

/** Send new/incomplete orgs to setup wizard first */
export function getPostLoginRoute(role?: string, onboarding?: { completed?: number | boolean; task_board?: { progress_pct?: number } }): string {
  const incomplete = onboarding && !onboarding.completed && (onboarding.task_board?.progress_pct ?? 0) < 100
  if (incomplete && canAccessModule(role, 'onboarding')) return '/dashboard/onboarding'
  return getDefaultRoute(role)
}
