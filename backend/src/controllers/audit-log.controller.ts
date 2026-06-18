import { Request, Response } from 'express'
import { queryAll } from '../lib/db'

export async function getAll(req: Request, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string) || 100
  const logs = await queryAll(
    `SELECT a.*, u.name as user_name FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.company_id = $1 ORDER BY a.created_at DESC LIMIT $2`,
    [req.user.company_id, limit],
  )
  res.json({ data: logs })
}
