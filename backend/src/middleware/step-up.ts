/**
 * requireStepUp — gate a sensitive action behind a fresh step-up proof.
 *
 * SHADOW by default: if the `X-Step-Up` header is missing/invalid, it logs
 * `stepup_would_block` and CONTINUES (no behavior change). It enforces (401)
 * only when STEP_UP_ENFORCE=on. In shadow it VERIFIES the token but does not
 * consume it (so observation never burns a user's single-use token); under
 * enforcement it consumes (single-use).
 */
import { Request, Response, NextFunction } from 'express'
import { verifyStepUp, consumeStepUp } from '../lib/mfa'
import { writeAudit } from '../lib/audit'
import { getRequestContext } from '../lib/request-context'

export function requireStepUp(dataClass = 'RESTRICTED') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const enforce = process.env.STEP_UP_ENFORCE === 'on'
    const userId = (req as any).user?.id as string | undefined
    const token = (req.headers['x-step-up'] as string | undefined) || ''
    let ok = false
    if (token) {
      const r = enforce ? await consumeStepUp(token, userId) : await verifyStepUp(token, userId)
      ok = r.ok
    }
    if (ok) { next(); return }

    const ctx = getRequestContext()
    void writeAudit({
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      action: enforce ? 'stepup.blocked' : 'stepup_would_block',
      resource: `${req.method} ${ctx.endpoint || req.path}`,
      securityTier: 'T1',
      meta: { data_class: dataClass, had_token: !!token, enforce },
    }).catch(() => {})

    if (enforce) { res.status(401).json({ error: 'step-up required', code: 'STEP_UP_REQUIRED' }); return }
    next() // shadow — observe only
  }
}
