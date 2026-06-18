import { Request, Response } from 'express'
import { queryAll, queryOne } from '../lib/db'
import { recommendEmployees, assignTask } from '../lib/task-matching'
import { departmentScope } from '../lib/departments'
import { AI_AGENTS } from '../lib/ai-agents'
import { unreadCount } from '../lib/notifications'

/** Admin/CEO command center — มองทั้งระบบ */
export async function commandCenter(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const isAdmin = (req.user.role || '').toLowerCase() === 'admin'

  const apiUsage = await queryAll(
    `SELECT u.name, u.department, COUNT(*) as calls, SUM(al.cost_thb) as cost, SUM(al.tokens_used) as tokens
     FROM ai_logs al JOIN users u ON u.id = al.user_id
     WHERE al.company_id = $1 GROUP BY u.id ORDER BY calls DESC LIMIT 20`,
    [cid],
  )

  const kpiByUser = await queryAll(
    `SELECT u.name, u.department, ke.metric_key, AVG(ke.value) as avg_value
     FROM kpi_entries ke JOIN users u ON u.id = ke.user_id
     WHERE ke.company_id = $1 GROUP BY u.id, ke.metric_key ORDER BY u.name LIMIT 50`,
    [cid],
  )

  const skillsByUser = await queryAll(
    `SELECT u.name, u.department, ss.skill_name, ss.score
     FROM skill_scores ss JOIN users u ON u.id = ss.user_id
     WHERE ss.company_id = $1 ORDER BY ss.score DESC LIMIT 50`,
    [cid],
  )

  const pendingLogs = await queryAll(
    `SELECT wl.*, u.name as user_name FROM work_logs wl
     JOIN users u ON u.id = wl.user_id
     WHERE wl.company_id = $1 AND wl.status IN ('review','pending')
     ORDER BY wl.created_at DESC LIMIT 30`,
    [cid],
  )

  const deptStats = await queryAll(
    `SELECT department, COUNT(*) as headcount FROM users
     WHERE company_id = $1 AND status = 'active' GROUP BY department`,
    [cid],
  )

  const notificationsUnread = isAdmin
    ? await queryOne(
        'SELECT COUNT(*) as c FROM notifications WHERE company_id = $1 AND read_flag = 0',
        [cid],
      )
    : { c: await unreadCount(req.user.id, cid) }

  res.json({
    agents: AI_AGENTS,
    api_usage: apiUsage,
    kpi_by_user: kpiByUser,
    skills_by_user: skillsByUser,
    pending_work_logs: pendingLogs,
    departments: deptStats,
    notifications_unread: Number(notificationsUnread?.c || 0),
    ai_configured: !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY),
  })
}

export async function recommend(req: Request, res: Response): Promise<void> {
  const { skill_key, department } = req.query
  const scope = departmentScope(req.user)
  const dept = scope || (department as string) || req.user.department
  const data = await recommendEmployees({
    companyId: req.user.company_id,
    department: dept || undefined,
    skillKey: skill_key as string | undefined,
  })
  res.json({ data })
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const { assigned_to, title, description, skill_key, due_date, match_score } = req.body
  if (!assigned_to || !title) {
    res.status(400).json({ error: 'assigned_to และ title จำเป็น' })
    return
  }
  const result = await assignTask({
    companyId: req.user.company_id,
    assignedBy: req.user.id,
    assignedTo: assigned_to,
    title,
    description,
    skillKey: skill_key,
    dueDate: due_date,
    matchScore: match_score,
  })
  res.status(201).json(result)
}
