/** NEXUS OS frontend RBAC — mirrors backend/src/lib/rbac.ts */

export const ROLES = [
  'admin', 'ceo',
  'operations', 'medical', 'dental', 'finance', 'hr', 'it',
  'marketing', 'warehouse', 'franchise', 'sales', 'staff',
] as const

// Every role — for company-wide features available to all staff.
const ALL: string[] = [...ROLES]

export const MODULE_ACCESS: Record<string, string[]> = {
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
