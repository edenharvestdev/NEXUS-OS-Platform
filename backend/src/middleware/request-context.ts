import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { runWithContext } from '../lib/request-context'

function deviceFromUA(ua: string): string {
  if (!ua) return 'unknown'
  if (/\b(ipad|tablet)\b/i.test(ua)) return 'tablet'
  if (/\b(mobile|iphone|android)\b/i.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * Read the real client IP from X-Forwarded-For (Railway/Cloudflare sit in
 * front) WITHOUT enabling Express `trust proxy` — that would also change the
 * rate-limiter's keying, and this PR must stay behavior-neutral. Flipping
 * `trust proxy` for rate-limit correctness is a separate, intentional change.
 * TODO(P0): set `app.set('trust proxy', 1)` once rate-limit per-client keying
 * is reviewed.
 */
function clientIp(req: Request): string {
  const xff = (req.headers['x-forwarded-for'] as string) || ''
  const first = xff.split(',')[0].trim()
  return first || req.ip || req.socket?.remoteAddress || ''
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = (req.headers['x-request-id'] as string) || ''
  const requestId = incoming && incoming.length > 0 && incoming.length <= 100 ? incoming : randomUUID()
  res.setHeader('x-request-id', requestId)

  const ua = (req.headers['user-agent'] as string) || ''
  runWithContext(
    {
      requestId,
      ip: clientIp(req),
      userAgent: ua.slice(0, 300),
      device: deviceFromUA(ua),
      endpoint: (req.originalUrl || req.url || '').split('?')[0],
      method: req.method,
    },
    () => next(),
  )
}
