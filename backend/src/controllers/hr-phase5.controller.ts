import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'
import { ensureHrDefaults } from '../lib/hr-init'
import { initLeaveApprovalSteps, getEnabledLeaveSteps, syncEmployeeLeaveQuotas } from '../lib/hr-leave-workflow'
import { APPROVE_FLAG } from '../lib/nexus-hr-phase6-schema'

const FLAG = APPROVE_FLAG

async function initApprovalSteps(companyId: string, leaveId: string) {
  await initLeaveApprovalSteps(companyId, leaveId)
}

export async function listHrLeave(req: Request, res: Response): Promise<void> {
  await ensureHrDefaults(req.user.company_id)
  const role = (req.user.role || 'staff').toLowerCase()
  let sql = `SELECT l.*, u.name as employee_name FROM leave_requests l
     LEFT JOIN users u ON u.id = l.user_id WHERE l.company_id = $1`
  const params: any[] = [req.user.company_id]
  if (role === 'staff') {
    sql += ' AND l.user_id = $2'
    params.push(req.user.id)
  }
  sql += ' ORDER BY l.created_at DESC'
  const leaves = await queryAll(sql, params)
  const withSteps = await Promise.all(leaves.map(async (l: any) => {
    const steps = await queryAll(
      `SELECT * FROM leave_approval_steps WHERE leave_id = $1 ORDER BY level`,
      [l.id],
    )
    return { ...l, approval_steps: steps }
  }))
  res.json({ data: withSteps })
}

export async function createHrLeave(req: Request, res: Response): Promise<void> {
  const { user_id, type, days, reason, start_date, end_date } = req.body
  const targetUserId = user_id || req.user.id
  const leaveDays = Number(days) || 1
  if (!type || !start_date) {
    res.status(400).json({ error: 'type และ start_date จำเป็น' }); return
  }

  const steps = await getEnabledLeaveSteps(req.user.company_id)
  const id = newId()
  await run(
    `INSERT INTO leave_requests (id, company_id, user_id, type, days, reason, start_date, status, approve_flag, approval_level, required_levels)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,0,$9)`,
    [id, req.user.company_id, targetUserId, type, leaveDays, reason || '', start_date, FLAG.pending, steps.length],
  )
  await initApprovalSteps(req.user.company_id, id)
  const data = await queryOne('SELECT * FROM leave_requests WHERE id = $1', [id])
  res.json({ data })
}

export async function approveLeaveStep(req: Request, res: Response): Promise<void> {
  const leaveId = String(req.params.id)
  const { action, note } = req.body as { action: 'approve' | 'reject'; note?: string }
  const role = (req.user.role || 'staff').toLowerCase()
  if (!['admin', 'hr', 'finance'].includes(role)) {
    res.status(403).json({ error: 'ไม่มีสิทธิ์อนุมัติ' }); return
  }

  const leave = await queryOne('SELECT * FROM leave_requests WHERE id = $1 AND company_id = $2', [leaveId, req.user.company_id])
  if (!leave) { res.status(404).json({ error: 'ไม่พบคำขอลา' }); return }
  if (leave.approve_flag === FLAG.rejected || leave.status === 'rejected') {
    res.status(400).json({ error: 'คำขอถูกปฏิเสธแล้ว' }); return
  }

  const currentLevel = Number(leave.approval_level || 0) + 1
  const step = await queryOne(
    `SELECT * FROM leave_approval_steps WHERE leave_id = $1 AND level = $2`,
    [leaveId, currentLevel],
  )
  if (!step) { res.status(400).json({ error: 'ไม่มีขั้นตอนอนุมัติ' }); return }
  if (role !== 'admin' && step.approver_role !== role) {
    res.status(403).json({ error: `ขั้นตอนนี้ต้องอนุมัติโดย ${step.approver_role}` }); return
  }

  if (action === 'reject') {
    await run(`UPDATE leave_approval_steps SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, note = $2 WHERE id = $3`,
      [req.user.id, note || '', step.id])
    await run(`UPDATE leave_requests SET status = 'rejected', approve_flag = $1 WHERE id = $2`, [FLAG.rejected, leaveId])
    res.json({ success: true, status: 'rejected' })
    return
  }

  await run(`UPDATE leave_approval_steps SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, note = $2 WHERE id = $3`,
    [req.user.id, note || '', step.id])

  const required = Number(leave.required_levels || 0) || (await getEnabledLeaveSteps(req.user.company_id)).length
  if (currentLevel >= required) {
    await run(`UPDATE leave_requests SET status = 'approved', approve_flag = $1, approval_level = $2 WHERE id = $3`,
      [FLAG.approved, currentLevel, leaveId])
    await run(
      'UPDATE users SET leave_used = COALESCE(leave_used, 0) + $1 WHERE id = $2 AND company_id = $3',
      [Number(leave.days) || 0, leave.user_id, req.user.company_id],
    )
    await syncEmployeeLeaveQuotas(req.user.company_id, leave.user_id)
    const year = new Date(leave.start_date || Date.now()).getFullYear()
    const lt = await queryOne(
      'SELECT id FROM leave_types WHERE company_id = $1 AND (name = $2 OR code = $2) LIMIT 1',
      [req.user.company_id, leave.type],
    )
    if (lt) {
      await run(
        `UPDATE employee_leave_quota SET used_days = used_days + $1 WHERE user_id = $2 AND leave_type_id = $3 AND year = $4 AND company_id = $5`,
        [Number(leave.days) || 0, leave.user_id, lt.id, year, req.user.company_id],
      )
    }
    res.json({ success: true, status: 'approved' })
    return
  }

  await run(`UPDATE leave_requests SET approval_level = $1 WHERE id = $2`, [currentLevel, leaveId])
  res.json({ success: true, status: 'pending', level: currentLevel })
}

export async function listOtTypes(req: Request, res: Response): Promise<void> {
  await ensureHrDefaults(req.user.company_id)
  const rows = await queryAll('SELECT * FROM overtime_types WHERE company_id = $1 ORDER BY code', [req.user.company_id])
  res.json({ data: rows })
}

export async function listOtRequests(req: Request, res: Response): Promise<void> {
  const role = (req.user.role || 'staff').toLowerCase()
  let sql = `SELECT o.*, u.name as employee_name, t.name as ot_type_name, t.multiplier
    FROM overtime_requests o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN overtime_types t ON t.id = o.ot_type_id
    WHERE o.company_id = $1`
  const params: any[] = [req.user.company_id]
  if (role === 'staff') { sql += ' AND o.user_id = $2'; params.push(req.user.id) }
  sql += ' ORDER BY o.created_at DESC'
  res.json({ data: await queryAll(sql, params) })
}

export async function createOtRequest(req: Request, res: Response): Promise<void> {
  const { work_date, hours, ot_type_id, reason, user_id } = req.body
  if (!work_date || !hours || !ot_type_id) {
    res.status(400).json({ error: 'work_date, hours, ot_type_id จำเป็น' }); return
  }
  const id = newId()
  await run(
    `INSERT INTO overtime_requests (id, company_id, user_id, work_date, hours, ot_type_id, reason, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
    [id, req.user.company_id, user_id || req.user.id, work_date, Number(hours), ot_type_id, reason || ''],
  )
  res.json({ data: await queryOne('SELECT * FROM overtime_requests WHERE id = $1', [id]) })
}

export async function reviewOtRequest(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id)
  const { status } = req.body
  if (!['approved', 'rejected'].includes(status)) { res.status(400).json({ error: 'status ไม่ถูกต้อง' }); return }
  await run(
    `UPDATE overtime_requests SET status = $1, approved_by = $2 WHERE id = $3 AND company_id = $4`,
    [status, req.user.id, id, req.user.company_id],
  )
  res.json({ success: true })
}

export async function exportPayslipHtml(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.userId)
  const periodId = String(req.params.periodId)
  const slip = await queryOne(
    `SELECT p.*, u.name as employee_name, u.department, c.name as company_name
     FROM payslips p JOIN users u ON u.id = p.user_id JOIN companies c ON c.id = p.company_id
     WHERE p.company_id = $1 AND p.user_id = $2 AND p.period_id = $3`,
    [req.user.company_id, userId, periodId],
  )
  if (!slip) { res.status(404).json({ error: 'ไม่พบสลิป' }); return }
  const items = await queryAll(
    `SELECT * FROM payroll_items WHERE period_id = $1 AND user_id = $2 ORDER BY item_type, code`,
    [periodId, userId],
  )
  const period = await queryOne('SELECT * FROM payroll_periods WHERE id = $1', [periodId])
  const rows = items.map((it: any) =>
    `<tr><td>${it.name}</td><td style="text-align:right">${it.item_type === 'deduction' ? '-' : ''}฿${Number(it.amount).toLocaleString()}</td></tr>`,
  ).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>สลิปเงินเดือน</title>
<style>body{font-family:sans-serif;padding:32px;max-width:640px;margin:auto}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px;border-bottom:1px solid #eee}.net{font-size:22px;font-weight:bold;color:#B48648;margin-top:20px}</style></head>
<body><h1>${slip.company_name}</h1><p>สลิปเงินเดือน ${period?.year}/${period?.month}</p>
<p><strong>${slip.employee_name}</strong> · ${slip.department || ''}</p>
<table>${rows}</table>
<p class="net">สุทธิ: ฿${Number(slip.net).toLocaleString()}</p>
<p style="font-size:11px;color:#888">SSO ฿${Number(slip.sso_employee).toLocaleString()} · ภาษี ฿${Number(slip.tax_wht).toLocaleString()}</p>
<script>window.onload=()=>window.print()</script></body></html>`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}
