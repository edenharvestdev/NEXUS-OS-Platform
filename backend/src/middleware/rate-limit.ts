import { Request, Response, NextFunction } from 'express'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const LIMITS: Record<string, { windowMs: number; max: number }> = {
  '/api/auth/signin': { windowMs: 60000, max: 10 },
  '/api/auth/signup': { windowMs: 60000, max: 5 },
  '/api/chat': { windowMs: 60000, max: 30 },
  default: { windowMs: 60000, max: 120 },
}

function getKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const path = req.baseUrl + req.path
  return `${ip}:${path}`
}

function matchLimit(path: string) {
  for (const [prefix, limit] of Object.entries(LIMITS)) {
    if (prefix !== 'default' && path.startsWith(prefix)) return limit
  }
  return LIMITS.default
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.baseUrl + req.path
  const limit = matchLimit(path)
  const key = getKey(req)
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + limit.windowMs }
    buckets.set(key, bucket)
  }
  bucket.count++
  res.setHeader('X-RateLimit-Limit', String(limit.max))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit.max - bucket.count)))
  if (bucket.count > limit.max) {
    res.status(429).json({ error: 'Too many requests — ลองใหม่ในอีกสักครู่' })
    return
  }
  next()
}

/** For tests */
export function _resetRateLimits(): void {
  buckets.clear()
}
