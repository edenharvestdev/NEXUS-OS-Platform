import { Request, Response } from 'express'
import { queryAll, queryOne } from '../lib/db'
import { routeAI } from '../lib/ai-router'
import { getBurnoutRisk } from '../lib/daily-task-agent'

/** L6 CEO Agent — executive daily brief */
export async function getBrief(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const [health, burnout, pendingLogs, kpiTrend] = await Promise.all([
    queryOne(
      `SELECT COUNT(*) as staff FROM users WHERE company_id = $1 AND status = 'active'`,
      [cid],
    ),
    getBurnoutRisk(cid),
    queryOne(`SELECT COUNT(*) as c FROM work_logs WHERE company_id = $1 AND status IN ('pending','review')`, [cid]),
    queryAll(
      `SELECT metric_key, AVG(value) as avg_val FROM kpi_entries WHERE company_id = $1 GROUP BY metric_key LIMIT 10`,
      [cid],
    ),
  ])

  const highRisk = burnout.filter((b: any) => b.risk === 'high')
  let strategy = ''
  try {
    const prompt = `คุณคือ CEO Agent ของ NEXUS OS. สรุปสถานะองค์กรวันนี้เป็นภาษาไทย (5 bullet):
- พนักงาน active: ${health?.staff}
- Work log รออนุมัติ: ${pendingLogs?.c}
- Burnout risk สูง: ${highRisk.length} คน
- KPI trends: ${JSON.stringify(kpiTrend)}`
    strategy = (await routeAI(prompt, 'strategy', {
      companyId: cid,
      userId: req.user.id,
      userRole: req.user.role,
      grounded: true,
    })).response || ''
  } catch {
    strategy = `• พนักงาน ${health?.staff} คน\n• Work log ค้าง ${pendingLogs?.c}\n• ติดตาม burnout ${highRisk.length} คน`
  }

  res.json({
    brief: strategy,
    metrics: { staff: health?.staff, pending_logs: pendingLogs?.c, high_burnout: highRisk.length },
    burnout_alerts: highRisk,
    kpi_trends: kpiTrend,
    generated_at: new Date().toISOString(),
  })
}
