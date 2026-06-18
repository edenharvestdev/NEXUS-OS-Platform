import { Request, Response } from 'express'
import { queryAll, queryOne } from '../lib/db'

/** L6 Daily Readiness — executive morning dashboard */
export async function getReadiness(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id

  const people = await queryOne(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM users WHERE company_id = $1`,
    [cid],
  )
  const tasks = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as done FROM tasks WHERE company_id = $1`, [cid])
  const finance = await queryOne(
    `SELECT COALESCE(SUM(CASE WHEN type = 'income' AND status = 'approved' THEN amount ELSE 0 END), 0) as income,
     COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'approved' THEN amount ELSE 0 END), 0) as expense
     FROM transactions WHERE company_id = $1`,
    [cid],
  )
  const customer = await queryOne(`SELECT AVG(probability) as avg_prob FROM deals WHERE company_id = $1`, [cid])

  const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0)
  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  const peopleScore = clamp((num(people?.active) / Math.max(num(people?.total), 1)) * 100)
  const operationScore = clamp(num(tasks?.total) > 0 ? (num(tasks?.done) / num(tasks?.total)) * 100 : 65)
  const income = num(finance?.income)
  const margin = income > 0 ? (income - num(finance?.expense)) / income : 0
  const financeScore = clamp(50 + margin * 50)
  const customerScore = clamp(num(customer?.avg_prob) || 50)
  const score = Math.round((peopleScore + operationScore + financeScore + customerScore) / 4)

  const [aiTasks, logs, kpis, onboarding] = await Promise.all([
    queryOne(`SELECT COUNT(*) as open FROM daily_ai_tasks WHERE company_id = $1 AND done = 0`, [cid]),
    queryOne(`SELECT COUNT(*) as pending FROM work_logs WHERE company_id = $1 AND status IN ('pending','review')`, [cid]),
    queryOne(`SELECT COUNT(*) as entries FROM kpi_entries WHERE company_id = $1`, [cid]),
    queryOne('SELECT step, completed, industry FROM onboarding_state WHERE company_id = $1', [cid]),
  ])

  const readiness = score >= 75 ? 'ready' : score >= 50 ? 'caution' : 'at_risk'

  res.json({
    readiness,
    organization_health_score: score,
    dimensions: {
      people: { score: Math.round(peopleScore), label: 'People' },
      operation: { score: Math.round(operationScore), label: 'Operation' },
      finance: { score: Math.round(financeScore), label: 'Finance' },
      customer: { score: Math.round(customerScore), label: 'Customer' },
    },
    checklist: [
      { item: 'Onboarding', ok: !!onboarding?.completed, detail: onboarding ? `Step ${onboarding.step}/6 (${onboarding.industry})` : 'Not started' },
      { item: 'KPI entries', ok: Number(kpis?.entries || 0) > 0, detail: `${kpis?.entries || 0} total` },
      { item: 'Work logs pending review', ok: Number(logs?.pending || 0) < 5, detail: `${logs?.pending || 0} pending` },
      { item: 'Open AI tasks', ok: Number(aiTasks?.open || 0) < 20, detail: `${aiTasks?.open || 0} open` },
    ],
    recommendation: readiness === 'ready'
      ? 'องค์กรพร้อมตัดสินใจ — ใช้ Feasibility Simulation ได้'
      : 'ให้พนักงานกรอก My Data และ Work Log ให้ครบก่อน',
    updated_at: new Date().toISOString(),
  })
}
