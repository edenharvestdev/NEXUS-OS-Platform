import { Request, Response, NextFunction } from 'express'
import { run, newId } from '../lib/db'

const SLOW_MS = 2000

export function requestMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration >= SLOW_MS || res.statusCode >= 500) {
      run(
        `INSERT INTO request_metrics (id, method, path, status_code, duration_ms) VALUES ($1,$2,$3,$4,$5)`,
        [newId(), req.method, req.path, res.statusCode, duration],
      ).catch(() => {})
    }
  })
  next()
}
