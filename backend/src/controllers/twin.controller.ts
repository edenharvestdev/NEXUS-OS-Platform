import { Request, Response } from 'express'
import { queryAll } from '../lib/db'
import { DEFAULT_DEPARTMENTS } from '../lib/nexus-extended-schema'

export async function getAll(req: Request, res: Response): Promise<void> {
  const depts = await queryAll(
    `SELECT d.*, u.name as head_name,
      (SELECT COUNT(*) FROM users WHERE company_id = d.company_id AND department = d.name) as headcount
     FROM departments d LEFT JOIN users u ON u.id = d.head_user_id
     WHERE d.company_id = $1 ORDER BY d.name`,
    [req.user.company_id],
  )

  const users = await queryAll(
    `SELECT id, name, role, department, status, leave_used, leave_total FROM users WHERE company_id = $1 AND status = 'active'`,
    [req.user.company_id],
  )

  const pendingTasks = await queryAll(
    `SELECT COUNT(*) as cnt FROM tasks WHERE company_id = $1 AND done = 0`,
    [req.user.company_id],
  )

  const capacities = await queryAll(
    `SELECT u.id, u.name, u.role, u.department, COALESCE(c.hours_per_day, 8) as hours_per_day,
      COALESCE(c.workload_score, 50) as workload_score
     FROM users u LEFT JOIN user_capacity c ON c.user_id = u.id
     WHERE u.company_id = $1 AND u.status = 'active'`,
    [req.user.company_id],
  )

  const skillGraph = await queryAll(
    `SELECT user_id, skill_key, skill_name, score FROM skill_scores WHERE company_id = $1 ORDER BY score DESC`,
    [req.user.company_id],
  )

  res.json({
    departments: depts.length ? depts : DEFAULT_DEPARTMENTS.map(name => ({ name, headcount: users.filter((u: any) => u.department === name).length })),
    people: users,
    capacity: {
      active_staff: users.length,
      pending_tasks: pendingTasks[0]?.cnt || 0,
      avg_leave_used: users.length ? users.reduce((s: number, u: any) => s + (u.leave_used || 0), 0) / users.length : 0,
      slots: capacities,
    },
    skill_graph: skillGraph,
  })
}
