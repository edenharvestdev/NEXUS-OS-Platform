/** NEXUS OS frontend RBAC — mirrors backend/src/lib/rbac.ts */

export const ROLES = ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] as const

export const MODULE_ACCESS: Record<string, string[]> = {
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

export function normalizeRole(role?: string): string {
  return (role || 'staff').toLowerCase()
}

const EXTRA_MODULES_KEY = 'nexus_extra_modules'

export function setExtraModules(mods: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(EXTRA_MODULES_KEY, JSON.stringify(mods))
  }
}

export function getExtraModules(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(EXTRA_MODULES_KEY) || '[]')
  } catch {
    return []
  }
}

export function canAccessModule(role: string | undefined, module: string): boolean {
  const r = normalizeRole(role)
  if (r === 'admin') return true
  if (getExtraModules().includes(module)) return true
  return MODULE_ACCESS[module]?.includes(r) ?? false
}

/** Unified landing — NEXUS Intelligence + HR in one home */
export function getDefaultRoute(role?: string): string {
  return '/dashboard/home'
}

/** Always land on home — org setup is optional from sidebar */
export function getPostLoginRoute(_role?: string, _onboarding?: { completed?: number | boolean; task_board?: { progress_pct?: number } }): string {
  return getDefaultRoute()
}
