import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { queryOne } from '../lib/db'
import { patchContext } from '../lib/request-context'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production')
  return secret || 'nexasos_dev_secret_change_in_production'
}

export type JwtPayload = {
  id: string
  company_id: string
  impersonated_by?: string
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Unauthorized — no token' }); return }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload
    const user = await queryOne(
      `SELECT u.*, c.name as company_name FROM users u
       LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
      [payload.id]
    )
    if (!user) { res.status(401).json({ error: 'User not found' }); return }
    req.user = { ...user, companies: { id: user.company_id, name: user.company_name } }
    req.jwtPayload = payload
    // Attach actor identity to the request context so audit logs can record
    // who did what without threading it through every handler. sessionId is a
    // stable per-token hash (no jti in the JWT yet).
    patchContext({
      actorUserId: user.id,
      actorRole: user.role,
      companyId: user.company_id,
      impersonatedBy: payload.impersonated_by,
      sessionId: crypto.createHash('sha256').update(token).digest('hex').slice(0, 24),
    })
    if (payload.impersonated_by) {
      const actor = await queryOne('SELECT id, name, email, role FROM users WHERE id = $1', [payload.impersonated_by])
      req.impersonation = { active: true, actor }
    } else if (user.role?.toLowerCase() === 'admin') {
      req.impersonation = { active: false, canImpersonate: true }
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: any
      jwtPayload?: JwtPayload
      impersonation?: { active: boolean; canImpersonate?: boolean; actor?: any }
    }
  }
}
