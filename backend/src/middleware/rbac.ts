import { Request, Response, NextFunction } from 'express'
import { canAccessModule, normalizeRole } from '../lib/rbac'
import { userCanAccessModule } from '../lib/user-permissions'

/** Department-head / management roles — everyone except plain `staff`.
 *  Use for manager-level actions (reviewing work logs, AI task assignment). */
export const MANAGER_ROLES = [
  'admin', 'ceo', 'hr', 'finance', 'sales', 'marketing', 'it',
  'operations', 'medical', 'dental', 'warehouse', 'franchise',
] as const

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = normalizeRole(req.user?.role)
    if (role === 'admin' || roles.map(r => r.toLowerCase()).includes(role)) {
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
