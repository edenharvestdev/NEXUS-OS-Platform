import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Wallet, Target, Megaphone,
  Mic2, MessageSquare, ShieldCheck, Zap, Settings,
  ClipboardList, Upload, Award, Activity, Database,
  Sparkles, Brain, Sunrise, TrendingUp,   Building2,
  ListTodo, Banknote, FileBarChart, UserCog, Globe,
  HelpCircle, CheckSquare, BookOpen, Clock, Wallet as WalletIcon, Timer,
  Headset, Stethoscope, Smile, Warehouse, Store,
} from 'lucide-react'

export type NavLink = {
  kind: 'link'
  id: string
  key: string
  Icon: LucideIcon
  roles: string[]
  module: string
  path?: string
  resolvePath?: (role: string) => string
}

export type NavGroup = {
  kind: 'group'
  id: string
  key: string
  Icon: LucideIcon
  roles: string[]
  children: Array<{
    id: string
    key: string
    path: string
    roles: string[]
    module: string
  }>
}

export type NavEntry = NavLink | NavGroup

export type NavSection = {
  titleKey: string
  entries: NavEntry[]
}

export function resolveNavPath(entry: NavLink, role: string): string {
  if (entry.resolvePath) return entry.resolvePath(role)
  return entry.path || '/dashboard'
}

export function isLinkActive(entry: NavLink, pathname: string, role: string): boolean {
  const path = resolveNavPath(entry, role)
  if (entry.id === 'home') return pathname === path || pathname === '/dashboard' || pathname === '/dashboard/staff'
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function isGroupChildActive(childPath: string, pathname: string): boolean {
  return pathname === childPath || pathname.startsWith(`${childPath}/`)
}

export function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.children.some(c => isGroupChildActive(c.path, pathname))
}

export function findActiveTitleKey(pathname: string, role: string, t: (k: string) => string): string {
  for (const section of visibleNavSections(role)) {
    for (const entry of section.entries) {
      if (entry.kind === 'link' && isLinkActive(entry, pathname, role)) return entry.key
      if (entry.kind === 'group') {
        const child = entry.children.find(c => isGroupChildActive(c.path, pathname))
        if (child) return child.key
      }
    }
  }
  return 'nav.home'
}

function link(
  id: string, key: string, Icon: LucideIcon, module: string, roles: string[],
  path?: string, resolvePath?: (role: string) => string,
): NavLink {
  return { kind: 'link', id, key, Icon, roles, module, path, resolvePath }
}

function group(id: string, key: string, Icon: LucideIcon, roles: string[], children: NavGroup['children']): NavGroup {
  return { kind: 'group', id, key, Icon, roles, children }
}

const REPORT_ROLES = ['admin', 'hr', 'finance'] as const

export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'nav.section.work',
    entries: [
      link('home', 'nav.home', LayoutDashboard, 'home', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/home'),
      link('worklog', 'nav.worklog', ClipboardList, 'worklog', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/worklog'),
      link('skills', 'nav.skills', Award, 'skills', ['admin', 'hr', 'it', 'staff'], '/dashboard/skills'),
      link('mydata', 'nav.mydata', Database, 'mydata', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/my-data'),
      link('myai', 'nav.myai', MessageSquare, 'myai', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/my-ai'),
    ],
  },
  {
    titleKey: 'nav.section.org',
    entries: [
      link('company', 'nav.company', Building2, 'org', ['admin', 'hr', 'it'], '/dashboard/org/company'),
      link('hr-org', 'nav.hrOrg', Building2, 'org', ['admin', 'hr'], '/dashboard/hr/org'),
      link('people', 'nav.people', Users, 'people', ['admin', 'hr'], '/dashboard/people'),
      link('payroll', 'nav.payroll', WalletIcon, 'reports', [...REPORT_ROLES], '/dashboard/hr/payroll'),
      link('attendance', 'nav.attendance', Clock, 'worklog', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/hr/attendance'),
      link('hr-leave', 'nav.hrLeave', CheckSquare, 'reports', [...REPORT_ROLES, 'staff'], '/dashboard/hr/leave'),
      link('leave-quotas', 'nav.leaveQuotas', BookOpen, 'reports', ['admin', 'hr'], '/dashboard/hr/leave-quotas'),
      link('overtime', 'nav.overtime', Timer, 'reports', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/hr/overtime'),
      link('todos', 'nav.todos', ListTodo, 'todos', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/work/todos'),
      link('advances', 'nav.advances', Banknote, 'advances', ['admin', 'hr', 'finance'], '/dashboard/hr/advances'),
      link('ingest', 'nav.ingest', Upload, 'ingest', ['admin', 'it', 'finance'], '/dashboard/ingest'),
      link('taxonomy', 'nav.taxonomy', Database, 'taxonomy', ['admin', 'it'], '/dashboard/taxonomy'),
    ],
  },
  {
    titleKey: 'nav.section.reports',
    entries: [
      link('report-annual', 'nav.report.annualTime', FileBarChart, 'reports', [...REPORT_ROLES], '/dashboard/reports/time/annual'),
      group('report-people', 'nav.report.groupPeople', Users, [...REPORT_ROLES], [
        { id: 'r-people-registry', key: 'nav.report.peopleRegistry', path: '/dashboard/reports/people/registry', roles: [...REPORT_ROLES], module: 'reports' },
        { id: 'r-people-salary', key: 'nav.report.salaryChange', path: '/dashboard/reports/people/salary-change', roles: [...REPORT_ROLES], module: 'reports' },
      ]),
      group('report-time', 'nav.report.groupTime', ClipboardList, [...REPORT_ROLES], [
        { id: 'r-time-calc', key: 'nav.report.timeCalc', path: '/dashboard/reports/time/calculation', roles: [...REPORT_ROLES], module: 'reports' },
        { id: 'r-time-att', key: 'nav.report.attendance', path: '/dashboard/reports/time/attendance', roles: [...REPORT_ROLES], module: 'reports' },
      ]),
      group('report-leave', 'nav.report.groupLeave', CheckSquare, [...REPORT_ROLES], [
        { id: 'r-leave-quota', key: 'nav.report.leaveQuota', path: '/dashboard/reports/leave/quota', roles: [...REPORT_ROLES], module: 'reports' },
      ]),
      group('report-payroll', 'nav.report.groupPayroll', Wallet, [...REPORT_ROLES], [
        { id: 'r-pay-period', key: 'nav.report.payrollPeriod', path: '/dashboard/reports/payroll/net-period', roles: [...REPORT_ROLES], module: 'reports' },
        { id: 'r-pay-annual', key: 'nav.report.payrollAnnual', path: '/dashboard/reports/payroll/net-annual', roles: [...REPORT_ROLES], module: 'reports' },
      ]),
      group('report-sso', 'nav.report.groupSso', ShieldCheck, [...REPORT_ROLES], [
        { id: 'r-sso-month', key: 'nav.report.ssoMonthly', path: '/dashboard/reports/sso/monthly', roles: [...REPORT_ROLES], module: 'reports' },
        { id: 'r-sso-kt20', key: 'nav.report.ssoKt20', path: '/dashboard/reports/sso/kt20', roles: [...REPORT_ROLES], module: 'reports' },
      ]),
      group('report-tax', 'nav.report.groupTax', FileBarChart, [...REPORT_ROLES], [
        { id: 'r-tax-pnd1', key: 'nav.report.taxPnd1', path: '/dashboard/reports/tax/pnd1', roles: [...REPORT_ROLES], module: 'reports' },
        { id: 'r-tax-pnd1k', key: 'nav.report.taxPnd1k', path: '/dashboard/reports/tax/pnd1k', roles: [...REPORT_ROLES], module: 'reports' },
        { id: 'r-tax-pnd3', key: 'nav.report.taxPnd3', path: '/dashboard/reports/tax/pnd3', roles: [...REPORT_ROLES], module: 'reports' },
      ]),
      group('report-accounting', 'nav.report.groupAccounting', BookOpen, [...REPORT_ROLES], [
        { id: 'r-acc-net', key: 'nav.report.accountingNet', path: '/dashboard/reports/accounting/net', roles: [...REPORT_ROLES], module: 'reports' },
        { id: 'r-acc-dept', key: 'nav.report.accountingDept', path: '/dashboard/reports/accounting/by-dept', roles: [...REPORT_ROLES], module: 'reports' },
      ]),
    ],
  },
  {
    titleKey: 'nav.section.ai',
    entries: [
      link('deptai', 'nav.deptai', Users, 'deptai', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/dept-ai'),
      link('meeting', 'nav.meeting', Mic2, 'meeting', ['admin', 'finance', 'hr', 'it', 'sales'], '/dashboard/meeting'),
      link('guardian', 'nav.guardian', ShieldCheck, 'guardian', ['admin', 'finance', 'it'], '/dashboard/guardian'),
      link('gpt', 'nav.gpt', MessageSquare, 'gpt', ['admin'], '/dashboard/gpt'),
      link('ai', 'nav.ai', Zap, 'ai', ['admin', 'it'], '/dashboard/ai'),
    ],
  },
  {
    titleKey: 'nav.section.dept',
    entries: [
      link('operations', 'nav.operations', Headset, 'operations', ['admin', 'ceo', 'operations'], '/dashboard/operations'),
      link('medical', 'nav.medical', Stethoscope, 'medical', ['admin', 'ceo', 'medical'], '/dashboard/medical'),
      link('dental', 'nav.dental', Smile, 'dental', ['admin', 'ceo', 'dental'], '/dashboard/dental'),
      link('finance', 'nav.finance', Wallet, 'finance', ['admin', 'ceo', 'finance'], '/dashboard/finance'),
      link('marketing', 'nav.marketing', Megaphone, 'marketing', ['admin', 'ceo', 'marketing'], '/dashboard/marketing'),
      link('warehouse', 'nav.warehouse', Warehouse, 'warehouse', ['admin', 'ceo', 'warehouse'], '/dashboard/warehouse'),
      link('franchise', 'nav.franchise', Store, 'franchise', ['admin', 'ceo', 'franchise'], '/dashboard/franchise'),
      link('sales', 'nav.sales', Target, 'sales', ['admin', 'ceo', 'sales'], '/dashboard/sales'),
    ],
  },
  {
    titleKey: 'nav.section.exec',
    entries: [
      link('readiness', 'nav.readiness', Sunrise, 'readiness', ['admin', 'ceo'], '/dashboard/readiness'),
      link('feasibility', 'nav.feasibility', TrendingUp, 'feasibility', ['admin', 'ceo'], '/dashboard/feasibility'),
      link('onboarding', 'nav.onboarding', Sparkles, 'onboarding', ['admin', 'hr', 'it'], '/dashboard/onboarding'),
      link('memory', 'nav.memory', Brain, 'memory', ['admin', 'it'], '/dashboard/memory'),
      link('audit', 'nav.audit', Activity, 'audit', ['admin', 'ceo', 'it', 'hr'], '/dashboard/audit'),
    ],
  },
  {
    titleKey: 'nav.section.settings',
    entries: [
      link('user-groups', 'nav.userGroups', UserCog, 'user-groups', ['admin', 'it'], '/dashboard/settings/user-groups'),
      link('users-admin', 'nav.usersAdmin', Users, 'users-admin', ['admin', 'it'], '/dashboard/settings/users'),
      link('domain', 'nav.domain', Globe, 'domain', ['admin'], '/dashboard/settings/domain'),
      link('settings-shifts', 'nav.settingsShifts', Clock, 'settings', ['admin', 'hr'], '/dashboard/settings/shifts'),
      link('settings-payroll', 'nav.settingsPayroll', WalletIcon, 'settings', ['admin', 'hr', 'finance'], '/dashboard/settings/payroll'),
      link('settings-leave-wf', 'nav.settingsLeaveWf', CheckSquare, 'settings', ['admin', 'hr'], '/dashboard/settings/leave-workflow'),
      link('settings-att-loc', 'nav.settingsAttLoc', Globe, 'settings', ['admin', 'hr', 'it'], '/dashboard/settings/attendance-locations'),
      link('settings', 'nav.settings', Settings, 'settings', ['admin', 'it'], '/dashboard/settings'),
      link('support', 'nav.support', HelpCircle, 'support', ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'], '/dashboard/support'),
    ],
  },
]

function entryVisible(entry: NavEntry, role: string, isAdmin: boolean): boolean {
  if (entry.kind === 'link') {
    return isAdmin || entry.roles.includes(role)
  }
  const visibleChildren = entry.children.filter(c => isAdmin || c.roles.includes(role))
  return visibleChildren.length > 0 && (isAdmin || entry.roles.includes(role))
}

function filterEntry(entry: NavEntry, role: string, isAdmin: boolean): NavEntry | null {
  if (!entryVisible(entry, role, isAdmin)) return null
  if (entry.kind === 'link') return entry
  const children = entry.children.filter(c => isAdmin || c.roles.includes(role))
  if (!children.length) return null
  return { ...entry, children }
}

export function visibleNavSections(role: string): NavSection[] {
  const r = (role || 'staff').toLowerCase()
  const isAdmin = r === 'admin'
  return NAV_SECTIONS.map(section => ({
    ...section,
    entries: section.entries
      .map(e => filterEntry(e, r, isAdmin))
      .filter((e): e is NavEntry => e !== null),
  })).filter(section => section.entries.length > 0)
}

/** Map URL path to RBAC module id */
const PATH_MODULE_ALIASES: Record<string, string> = {
  'my-data': 'mydata',
  'my-ai': 'myai',
  'dept-ai': 'deptai',
}

export function moduleFromPathname(pathname: string): string {
  if (pathname.startsWith('/dashboard/reports/')) return 'reports'
  if (pathname.startsWith('/dashboard/org/')) return 'org'
  if (pathname.startsWith('/dashboard/settings/user-groups')) return 'user-groups'
  if (pathname.startsWith('/dashboard/settings/users')) return 'users-admin'
  if (pathname.startsWith('/dashboard/settings/domain')) return 'domain'
  if (pathname.startsWith('/dashboard/settings')) return 'settings'
  if (pathname.startsWith('/dashboard/work/todos')) return 'todos'
  if (pathname.startsWith('/dashboard/hr/advances')) return 'advances'
  if (pathname.startsWith('/dashboard/home') || pathname.startsWith('/dashboard/staff')) return 'home'
  if (pathname.startsWith('/dashboard/hr/payroll')) return 'reports'
  if (pathname.startsWith('/dashboard/hr/leave')) return 'reports'
  if (pathname.startsWith('/dashboard/hr/overtime')) return 'reports'
  if (pathname.startsWith('/dashboard/hr/org')) return 'org'
  if (pathname.startsWith('/dashboard/support')) return 'support'
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'dashboard'
  const segment = pathname.replace('/dashboard/', '').split('/')[0] || 'dashboard'
  return PATH_MODULE_ALIASES[segment] || segment
}

// Legacy exports for any remaining imports
export type NavItem = NavLink
export function isNavItemActive(item: NavLink, pathname: string, role: string): boolean {
  return isLinkActive(item, pathname, role)
}
