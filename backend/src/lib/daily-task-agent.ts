import { queryAll, queryOne, run, newId } from './db'
import { ROLE_SKILLS } from './nexus-extended-schema'

const TASK_TEMPLATES: Record<string, string[]> = {
  admin: ['ตรวจ Organization Health Score', 'อนุมัติ Work Log ค้าง', 'Review Data Dictionary'],
  finance: ['บันทึกรายรับ-รายจ่ายวันนี้', 'ตรวจ transaction pending', 'อัปเดต KPI การเงิน'],
  hr: ['ตรวจ leave request', 'อัปเดต skill evidence ทีม', 'Review onboarding progress'],
  sales: ['อัปเดต pipeline deals', 'บันทึก follow-up ลูกค้า', 'กรอก KPI conversion'],
  marketing: ['อัปเดต campaign metrics', 'บันทึก content performance', 'Review customer retention KPI'],
  it: ['ตรวจ audit log', 'ทดสอบ LINE webhook', 'Review AI router status'],
  staff: ['บันทึก Work Log วันนี้', 'อัปเดต skill evidence', 'กรอก KPI หน้างาน'],
}

/** L2 — assign daily tasks by role + capacity (rule-based; AI optional via router) */
export async function generateDailyTasks(companyId: string, userId: string, role: string) {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  // Cross-DB: compare against a [today, tomorrow) range instead of SQLite's date().
  const existing = await queryOne(
    `SELECT COUNT(*) as c FROM daily_ai_tasks WHERE company_id = $1 AND user_id = $2 AND created_at >= $3 AND created_at < $4`,
    [companyId, userId, today, tomorrow],
  )
  if (Number(existing?.c || 0) > 0) return queryAll(
    `SELECT * FROM daily_ai_tasks WHERE company_id = $1 AND user_id = $2 AND done = 0 ORDER BY created_at DESC`,
    [companyId, userId],
  )

  const r = (role || 'staff').toLowerCase()
  const titles = TASK_TEMPLATES[r] || TASK_TEMPLATES.staff
  const skills = ROLE_SKILLS[r] || ROLE_SKILLS.staff
  const created: any[] = []

  for (let i = 0; i < titles.length; i++) {
    const id = newId()
    const skill = skills[i % skills.length]
    await run(
      `INSERT INTO daily_ai_tasks (id, company_id, user_id, title, reason, skill_key, assigned_by, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,'ai',$7)`,
      [id, companyId, userId, titles[i], `Assigned by L2 Agent based on role ${r} + capacity`, skill.key, today],
    )
    created.push({ id, title: titles[i], skill_key: skill.key, due_date: today, done: 0 })
  }
  return created
}

export async function getBurnoutRisk(companyId: string) {
  // Cross-DB: compute the 7-day cutoff in JS instead of SQLite's date('now', ...).
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const rows = await queryAll(
    `SELECT u.id, u.name, u.role, COALESCE(c.workload_score, 50) as workload,
      (SELECT COUNT(*) FROM daily_ai_tasks t WHERE t.user_id = u.id AND t.done = 0) as open_tasks,
      (SELECT COUNT(*) FROM work_logs w WHERE w.user_id = u.id AND w.created_at >= $2) as logs_7d
     FROM users u LEFT JOIN user_capacity c ON c.user_id = u.id
     WHERE u.company_id = $1 AND u.status = 'active'`,
    [companyId, since],
  )
  return rows.map((u: any) => ({
    ...u,
    risk: u.workload > 80 || u.open_tasks > 5 ? 'high' : u.workload > 60 ? 'medium' : 'low',
  }))
}
