import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'
import { writeAudit } from '../lib/audit'
import { onWorkLogApproved } from '../lib/skill-wallet'
import { computeSlaDue } from '../lib/sla-escalation'
import { departmentScope, canReviewWorkLog } from '../lib/departments'
import { notifyWorkSubmitted, notifyWorkReviewed } from '../lib/notifications'

export async function getAll(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const scope = departmentScope(req.user)
  const params: any[] = [cid]
  let sql = `SELECT wl.*, u.name as user_name FROM work_logs wl
     LEFT JOIN users u ON u.id = wl.user_id
     WHERE wl.company_id = $1`
  if (scope) {
    sql += ' AND wl.department = $2'
    params.push(scope)
  }
  sql += ' ORDER BY wl.created_at DESC LIMIT 200'
  const logs = await queryAll(sql, params)
  res.json(logs.map(mapLog))
}

export async function create(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const uid = req.user.id
  const {
    action_type, object, task_id, status, evidence_url,
    kpi_impact, security_tier, priority,
  } = req.body

  if (!action_type) { res.status(400).json({ error: 'action_type required' }); return }

  const id = newId()
  const needsSla = ['submit', 'issue'].includes(action_type)
  const slaDue = needsSla ? computeSlaDue(priority || 'med') : null

  const finalStatus = status || (action_type === 'submit' ? 'review' : 'pending')

  await run(
    `INSERT INTO work_logs (id, company_id, user_id, role, department, action_type, object, task_id, status, evidence_url, kpi_impact, security_tier, sla_due_at, escalation_level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0)`,
    [
      id, cid, uid, req.user.role, req.user.department,
      action_type, object || null, task_id || null,
      finalStatus,
      evidence_url || null,
      kpi_impact ?? 0, security_tier || 'T1',
      slaDue,
    ],
  )

  await writeAudit({
    companyId: cid, userId: uid, action: 'work_log_create',
    resource: 'work_log', resourceId: id, securityTier: security_tier || 'T1',
    meta: { action_type, object },
  })

  if (['submit', 'issue'].includes(action_type) || finalStatus === 'review') {
    const emp = await queryOne('SELECT name FROM users WHERE id = $1', [uid])
    await notifyWorkSubmitted({
      companyId: cid,
      fromUserId: uid,
      fromUserName: emp?.name || 'พนักงาน',
      department: req.user.department,
      object: object || undefined,
      workLogId: id,
    }).catch(() => {})
  }

  const log = await queryOne('SELECT * FROM work_logs WHERE id = $1', [id])
  res.status(201).json(mapLog(log))
}

export async function review(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const { status } = req.body
  if (!['approved', 'rejected', 'revision'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return
  }
  const existing = await queryOne(
    'SELECT * FROM work_logs WHERE id = $1 AND company_id = $2',
    [String(req.params.id), cid],
  )
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  if (!canReviewWorkLog(req.user, existing)) {
    res.status(403).json({ error: 'อนุมัติได้เฉพาะงานในแผนกของคุณ' })
    return
  }

  await run(
    `UPDATE work_logs SET status = $1, reviewed_by = $2, action_type = $3 WHERE id = $4`,
    [status, req.user.id, status === 'approved' ? 'approve' : 'reject', String(req.params.id)],
  )

  if (status === 'approved') {
    await onWorkLogApproved(cid, existing.user_id, existing.id, existing.role, Number(existing.kpi_impact || 0))
  }

  await writeAudit({ companyId: cid, userId: req.user.id, action: `work_log_${status}`, resource: 'work_log', resourceId: String(req.params.id) })

  const reviewer = await queryOne('SELECT name FROM users WHERE id = $1', [req.user.id])
  await notifyWorkReviewed({
    companyId: cid,
    employeeId: existing.user_id,
    reviewerId: req.user.id,
    reviewerName: reviewer?.name || 'หัวหน้า',
    status,
    object: existing.object,
    workLogId: String(req.params.id),
  }).catch(() => {})

  const log = await queryOne('SELECT * FROM work_logs WHERE id = $1', [String(req.params.id)])
  res.json(mapLog(log))
}

export async function runEscalation(req: Request, res: Response): Promise<void> {
  const { processEscalations } = await import('../lib/sla-escalation')
  const count = await processEscalations()
  res.json({ escalated: count })
}

function mapLog(row: any) {
  if (!row) return row
  return {
    log_id: row.id,
    timestamp: row.created_at,
    org_id: row.company_id,
    user_id: row.user_id,
    user_name: row.user_name,
    role: row.role,
    dept: row.department,
    action_type: row.action_type,
    object: row.object,
    task_id: row.task_id,
    status: row.status,
    evidence_url: row.evidence_url,
    kpi_impact: row.kpi_impact,
    reviewed_by: row.reviewed_by,
    security_tier: row.security_tier,
    sla_due_at: row.sla_due_at,
    escalation_level: row.escalation_level || 0,
    escalated_at: row.escalated_at,
  }
}
