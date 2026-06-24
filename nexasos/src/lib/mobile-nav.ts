import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, ClipboardList, MessageSquare, Menu } from 'lucide-react'
import { getDefaultRoute } from './rbac'

export type BottomTab = {
  id: string
  key: string
  Icon: LucideIcon
  action: 'route' | 'menu'
  path?: string
}

const WORK_PATHS = ['/dashboard/home', '/dashboard/worklog', '/dashboard/skills', '/dashboard/my-data', '/dashboard/work/todos', '/dashboard/hr']
const HR_PATHS = ['/dashboard/hr/attendance', '/dashboard/hr/leave', '/dashboard/hr/overtime', '/dashboard/hr/payroll']
const AI_PATHS = ['/dashboard/my-ai', '/dashboard/dept-ai', '/dashboard/meeting', '/dashboard/guardian', '/dashboard/gpt', '/dashboard/ai']

/** Primary bottom tabs — iOS / Android pattern */
export function getBottomTabs(role: string): BottomTab[] {
  const r = role || 'staff'
  return [
    { id: 'home', key: 'nav.home', Icon: LayoutDashboard, action: 'route', path: getDefaultRoute(r) },
    { id: 'worklog', key: 'nav.worklog', Icon: ClipboardList, action: 'route', path: '/dashboard/worklog' },
    { id: 'myai', key: 'nav.myai', Icon: MessageSquare, action: 'route', path: '/dashboard/my-ai' },
    { id: 'menu', key: 'nav.menu', Icon: Menu, action: 'menu' },
  ]
}

export function resolveBottomTabActive(pathname: string, role: string, drawerOpen: boolean): string {
  if (drawerOpen) return 'menu'
  const home = getDefaultRoute(role)
  if (pathname === home || pathname === '/dashboard/home') return 'home'
  if (WORK_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return 'worklog'
  if (HR_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return 'worklog'
  if (AI_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return 'myai'
  return 'menu'
}
