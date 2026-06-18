import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM tasks WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id],
  )
  res.json({ data })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { title, priority, due_date } = req.body
  if (!title?.trim()) { res.status(400).json({ error: 'title is required' }); return }
  const id = newId()
  await run(
    `INSERT INTO tasks (id, company_id, user_id, title, priority, due_date, done)
     VALUES ($1, $2, $3, $4, $5, $6, 0)`,
    [id, req.user.company_id, req.user.id, title.trim(), priority || 'med', due_date || null],
  )
  const data = await queryOne('SELECT * FROM tasks WHERE id = $1', [id])
  res.json({ data })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const fields = ['title', 'priority', 'due_date', 'done']
  const updates: string[] = []
  const vals: unknown[] = []
  let i = 1
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); vals.push(req.body[f]) }
  }
  if (!updates.length) { res.status(400).json({ error: 'No fields' }); return }
  vals.push(id, req.user.company_id)
  await run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${i++} AND company_id = $${i}`, vals)
  const data = await queryOne('SELECT * FROM tasks WHERE id = $1', [id])
  if (!data) { res.status(404).json({ error: 'Task not found' }); return }
  res.json({ data })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  await run('DELETE FROM tasks WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}
