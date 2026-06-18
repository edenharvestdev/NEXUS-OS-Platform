import { Request, Response, NextFunction } from 'express'
import { canAccessModule, normalizeRole } from '../lib/rbac'

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
  return (req: Request, res: Response, next: NextFunction): void => {
    if (canAccessModule(req.user?.role, module)) {
      next()
      return
    }
    res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง module นี้' })
  }
}
