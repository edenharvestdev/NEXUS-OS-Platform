import { queryAll, run, newId } from './db'
import { writeAudit } from './audit'

/** SLA levels 1–4 per NEXUS OS spec */
const SLA_HOURS = [4, 8, 24, 48]

export function computeSlaDue(priority = 'med'): string {
  const hours = priority === 'high' ? SLA_HOURS[0] : priority === 'low' ? SLA_HOURS[2] : SLA_HOURS[1]
  return new Date(Date.now() + hours * 3600000).toISOString()
}

export async function processEscalations(): Promise<number> {
  const overdue = await queryAll(
    `SELECT * FROM work_logs
     WHERE status IN ('pending','review')
       AND sla_due_at IS NOT NULL
       AND datetime(sla_due_at) < datetime('now')
       AND escalation_level < 4`,
    [],
  ).catch(() =>
    queryAll(
      `SELECT * FROM work_logs
       WHERE status IN ('pending','review')
         AND sla_due_at IS NOT NULL
         AND sla_due_at < NOW()
         AND escalation_level < 4`,
      [],
    ),
  )

  let count = 0
  for (const log of overdue) {
    const nextLevel = (parseInt(log.escalation_level) || 0) + 1
    const newDue = new Date(Date.now() + SLA_HOURS[Math.min(nextLevel - 1, 3)] * 3600000).toISOString()
    await run(
      `UPDATE work_logs SET escalation_level = $1, action_type = 'escalate', escalated_at = $2, sla_due_at = $3 WHERE id = $4`,
      [nextLevel, new Date().toISOString(), newDue, log.id],
    )
    await run(
      `INSERT INTO work_logs (id, company_id, user_id, role, department, action_type, object, status, security_tier, escalation_level)
       VALUES ($1,$2,$3,'system','System','escalate',$4,'pending','T1',$5)`,
      [
        newId(), log.company_id, log.user_id,
        `Auto-escalation L${nextLevel}: ${log.object || 'work item'}`,
        nextLevel,
      ],
    )
    await writeAudit({
      companyId: log.company_id,
      action: 'sla_escalate',
      resource: 'work_log',
      resourceId: log.id,
      meta: { level: nextLevel },
    })
    count++
  }
  return count
}

export function startSlaJob(intervalMs = 60000): void {
  if (process.env.VERCEL) return
  setInterval(() => {
    processEscalations().catch(err => console.error('SLA job error:', err.message))
  }, intervalMs)
  console.log('⏱️  SLA escalation job started (60s interval)')
}
