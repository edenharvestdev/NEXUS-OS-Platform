import { Request, Response, NextFunction } from 'express'
import { queryOne, run } from '../lib/db'

const TTL_MS = 24 * 60 * 60 * 1000

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'POST') { next(); return }
  const key = req.headers['idempotency-key'] as string | undefined
  if (!key || !req.user?.company_id) { next(); return }

  const route = req.baseUrl + req.path
  queryOne(
    'SELECT response, status_code, created_at FROM idempotency_keys WHERE key = $1',
    [key],
  ).then(existing => {
    if (existing) {
      const age = Date.now() - new Date(existing.created_at as string).getTime()
      if (age < TTL_MS) {
        res.status(Number(existing.status_code) || 200).json(JSON.parse(String(existing.response)))
        return
      }
    }

    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      run(
        `INSERT INTO idempotency_keys (key, company_id, user_id, route, response, status_code)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (key) DO UPDATE SET response = $5, status_code = $6`,
        [key, req.user.company_id, req.user.id, route, JSON.stringify(body), res.statusCode],
      ).catch(() => {})
      return originalJson(body)
    }
    next()
  }).catch(() => next())
}
