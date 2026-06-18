import { queryAll, queryOne, run, newId } from './db'
import { notifyTaskAssigned } from './notifications'

export interface EmployeeMatch {
  user_id: string
  name: string
  role: string
  department: string
  skill_score: number
  kpi_avg: number
  workload: number
  match_score: number
  strengths: string[]
  gaps: string[]
}

/** จับคู่งานจาก Skill + KPI รายเดือน — สำหรับหัวหน้าแผนก */
export async function recommendEmployees(opts: {
  companyId: string
  department?: string
  skillKey?: string
  limit?: number
}): Promise<EmployeeMatch[]> {
  const params: any[] = [opts.companyId]
  let userSql = `SELECT id, name, role, department FROM users WHERE company_id = $1 AND status = 'active'`
  if (opts.department) {
    userSql += ' AND department = $2'
    params.push(opts.department)
  }
  const users = await queryAll(userSql, params)
  const monthStart = new Date()
  monthStart.setDate(1)
  const periodPrefix = monthStart.toISOString().slice(0, 7)

  const results: EmployeeMatch[] = []

  for (const u of users) {
    const skillRow = opts.skillKey
      ? await queryOne(
          'SELECT score, skill_name FROM skill_scores WHERE company_id = $1 AND user_id = $2 AND skill_key = $3',
          [opts.companyId, u.id, opts.skillKey],
        )
      : await queryOne(
          'SELECT AVG(score) as score FROM skill_scores WHERE company_id = $1 AND user_id = $2',
          [opts.companyId, u.id],
        )

    const kpiRow = await queryOne(
      `SELECT AVG(value) as avg FROM kpi_entries
       WHERE company_id = $1 AND user_id = $2 AND period LIKE $3 || '%'`,
      [opts.companyId, u.id, periodPrefix],
    )

    const cap = await queryOne(
      'SELECT workload_score FROM user_capacity WHERE user_id = $1',
      [u.id],
    )

    const topSkills = await queryAll(
      `SELECT skill_name, score FROM skill_scores
       WHERE company_id = $1 AND user_id = $2 ORDER BY score DESC LIMIT 3`,
      [opts.companyId, u.id],
    )
    const lowSkills = await queryAll(
      `SELECT skill_name, score FROM skill_scores
       WHERE company_id = $1 AND user_id = $2 ORDER BY score ASC LIMIT 2`,
      [opts.companyId, u.id],
    )

    const skillScore = Number(skillRow?.score || 0)
    const kpiAvg = Number(kpiRow?.avg || 0)
    const workload = Number(cap?.workload_score ?? 50)

    let matchScore = skillScore * 0.5 + Math.min(kpiAvg, 100) * 0.3 + (100 - workload) * 0.2
    if (opts.skillKey && skillScore >= 70) matchScore += 10
    matchScore = Math.min(100, Math.round(matchScore))

    results.push({
      user_id: u.id,
      name: u.name,
      role: u.role,
      department: u.department,
      skill_score: Math.round(skillScore),
      kpi_avg: Math.round(kpiAvg * 10) / 10,
      workload,
      match_score: matchScore,
      strengths: topSkills.map((s: any) => `${s.skill_name} (${s.score})`),
      gaps: lowSkills.filter((s: any) => s.score < 60).map((s: any) => s.skill_name),
    })
  }

  results.sort((a, b) => b.match_score - a.match_score)
  return results.slice(0, opts.limit || 10)
}

export async function assignTask(opts: {
  companyId: string
  assignedBy: string
  assignedTo: string
  title: string
  description?: string
  skillKey?: string
  dueDate?: string
  matchScore?: number
}): Promise<{ id: string }> {
  const id = newId()
  await run(
    `INSERT INTO task_assignments (id, company_id, assigned_by, assigned_to, title, description, skill_key, due_date, match_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id, opts.companyId, opts.assignedBy, opts.assignedTo,
      opts.title, opts.description || null, opts.skillKey || null,
      opts.dueDate || null, opts.matchScore ?? 0,
    ],
  )

  await run(
    `INSERT INTO daily_ai_tasks (id, company_id, user_id, title, reason, skill_key, assigned_by, due_date, done)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0)`,
    [
      newId(), opts.companyId, opts.assignedTo, opts.title,
      opts.description || 'มอบหมายโดยหัวหน้าแผนก',
      opts.skillKey || null, opts.assignedBy, opts.dueDate || null,
    ],
  )

  await notifyTaskAssigned({
    companyId: opts.companyId,
    toUserId: opts.assignedTo,
    fromUserId: opts.assignedBy,
    title: opts.title,
    assignmentId: id,
    matchScore: opts.matchScore,
  })

  return { id }
}
