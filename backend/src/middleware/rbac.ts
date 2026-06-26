import { Request, Response, NextFunction } from 'express'
import { canAccessModule, normalizeRole } from '../lib/rbac'
import { userCanAccessModule } from '../lib/user-permissions'
import { shadowCheck } from '../lib/authz'

/** Department-head / management roles — everyone except plain `staff`.
 *  Use for manager-level actions (reviewing work logs, AI task assignment). */
export const MANAGER_ROLES = [
  'admin', 'ceo', 'hr', 'finance', 'sales', 'marketing', 'it',
  'operations', 'medical', 'dental', 'warehouse', 'franchise',
] as const

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = normalizeRole(req.user?.role)
    const inList = roles.map(r => r.toLowerCase()).includes(role)
    if (role === 'admin' || inList) {
      // Super-admin bypass #2 — admin passes even when not in the required list.
      if (role === 'admin' && !inList) {
        shadowCheck(`requireRole`, true, { allowed: false, reason: `admin not in required roles [${roles.join(',')}]` }, { required_roles: roles })
      }
      next()
      return
    }
    res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' })
  }
}

export function requireModule(module: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ok = await userCanAccessModule(req.user?.id, req.user?.role, module)
    if (ok) {
      next()
      return
    }
    res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง module นี้' })
  }
}
