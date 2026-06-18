import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

export async function getAll(req: Request, res: Response): Promise<void> {
  const role = (req.user.role || 'staff').toLowerCase()
  let sql = `SELECT l.*, u.name as employee_name FROM leave_requests l
     LEFT JOIN users u ON u.id = l.user_id WHERE l.company_id = $1`
  const params: any[] = [req.user.company_id]
  if (role === 'staff') {
    sql += ' AND l.user_id = $2'
    params.push(req.user.id)
  }
  sql += ' ORDER BY l.created_at DESC'
  const data = await queryAll(sql, params)
  res.json({ data })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { user_id, type, days, reason, start_date } = req.body
  const targetUserId = user_id || req.user.id
  const leaveDays = Number(days) || 1
  if (!type || !start_date) {
    res.status(400).json({ error: 'type และ start_date จำเป็น' }); return
  }

  const emp = await queryOne(
    'SELECT * FROM users WHERE id = $1 AND company_id = $2',
    [targetUserId, req.user.company_id],
  )
  if (!emp) { res.status(404).json({ error: 'ไม่พบพนักงาน' }); return }

  const id = newId()
  await run(
    `INSERT INTO leave_requests (id, company_id, user_id, type, days, reason, start_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [id, req.user.company_id, targetUserId, type, leaveDays, reason || '', start_date],
  )
  const data = await queryOne('SELECT * FROM leave_requests WHERE id = $1', [id])
  res.json({ data })
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { status } = req.body
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: 'status ไม่ถูกต้อง' }); return
  }

  const leave = await queryOne(
    'SELECT * FROM leave_requests WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id],
  )
  if (!leave) { res.status(404).json({ error: 'ไม่พบคำขอลา' }); return }

  await run(
    'UPDATE leave_requests SET status = $1 WHERE id = $2 AND company_id = $3',
    [status, id, req.user.company_id],
  )

  if (status === 'approved') {
    await run(
      'UPDATE users SET leave_used = COALESCE(leave_used, 0) + $1 WHERE id = $2 AND company_id = $3',
      [Number(leave.days) || 0, leave.user_id, req.user.company_id],
    )
    await run(
      "UPDATE users SET status = 'leave' WHERE id = $1 AND company_id = $2",
      [leave.user_id, req.user.company_id],
    )
  }

  const data = await queryOne('SELECT * FROM leave_requests WHERE id = $1', [id])
  res.json({ data })
}
