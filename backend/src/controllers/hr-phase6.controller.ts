import { Request, Response } from 'express'
import { randomBytes } from 'crypto'
import { queryAll, queryOne, run, newId } from '../lib/db'
import { ensureHrDefaults } from '../lib/hr-init'
import { getUserModules } from '../lib/user-permissions'
import { distanceMeters } from '../lib/geo'
import {
  ensureLeaveApprovalConfig,
  getEnabledLeaveSteps,
  syncEmployeeLeaveQuotas,
} from '../lib/hr-leave-workflow'
import {
  APPROVE_FLAG,
  DEFAULT_LEAVE_APPROVAL_CONFIG,
  DEFAULT_OT_APPROVAL_CHAIN,
} from '../lib/nexus-hr-phase6-schema'

// ── Permissions runtime ──────────────────────────────────────────
export async function getMyModules(req: Request, res: Response): Promise<void> {
  const mods = await getUserModules(req.user.id, req.user.role)
  res.json({ data: Array.from(mods) })
}

// ── Leave approval config (8 levels) ───────────────────────────────
export async function getLeaveApprovalConfig(req: Request, res: Response): Promise<void> {
  await ensureLeaveApprovalConfig(req.user.company_id)
  const rows = await queryAll(
    'SELECT * FROM leave_approval_config WHERE company_id = $1 ORDER BY level',
    [req.user.company_id],
  )
  res.json({ data: rows })
}

export async function updateLeaveApprovalConfig(req: Request, res: Response): Promise<void> {
  const { levels } = req.body as { levels: Array<{ level: number; enabled: boolean; approver_role?: string; label_th?: string }> }
  if (!Array.isArray(levels)) { res.status(400).json({ error: 'levels จำเป็น' }); return }
  await ensureLeaveApprovalConfig(req.user.company_id)
  for (const lv of levels) {
    await run(
      `UPDATE leave_approval_config SET enabled = $1, approver_role = COALESCE($2, approver_role), label_th = COALESCE($3, label_th)
       WHERE company_id = $4 AND level = $5`,
      [lv.enabled ? 1 : 0, lv.approver_role || null, lv.label_th || null, req.user.company_id, lv.level],
    )
  }
  res.json({ success: true })
}

// ── Leave quotas ─────────────────────────────────────────────────
export async function listLeaveQuotas(req: Request, res: Response): Promise<void> {
  await ensureHrDefaults(req.user.company_id)
  const year = Number(req.query.year) || new Date().getFullYear()
  const users = await queryAll('SELECT id FROM users WHERE company_id = $1', [req.user.company_id])
  for (const u of users) await syncEmployeeLeaveQuotas(req.user.company_id, u.id, year)
  const rows = await queryAll(
    `SELECT q.*, u.name as employee_name, lt.code as leave_code, lt.name as leave_name
     FROM employee_leave_quota q
     JOIN users u ON u.id = q.user_id
     JOIN leave_types lt ON lt.id = q.leave_type_id
     WHERE q.company_id = $1 AND q.year = $2 ORDER BY u.name, lt.code`,
    [req.user.company_id, year],
  )
  res.json({ data: rows })
}

export async function updateLeaveQuota(req: Request, res: Response): Promise<void> {
  const { id, quota_days } = req.body
  if (!id) { res.status(400).json({ error: 'ระบุ id' }); return }
  await run(
    'UPDATE employee_leave_quota SET quota_days = $1 WHERE id = $2 AND company_id = $3',
    [Number(quota_days), id, req.user.company_id],
  )
  res.json({ success: true })
}

// ── Attendance locations + QR ────────────────────────────────────
export async function listAttendanceLocations(req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    'SELECT * FROM attendance_locations WHERE company_id = $1 ORDER BY name',
    [req.user.company_id],
  )
  res.json({ data: rows })
}

export async function createAttendanceLocation(req: Request, res: Response): Promise<void> {
  const { name, lat, lng, radius_m } = req.body
  if (!name) { res.status(400).json({ error: 'กรอกชื่อจุดลงเวลา' }); return }
  const id = newId()
  const token = randomBytes(16).toString('hex')
  await run(
    `INSERT INTO attendance_locations (id, company_id, name, lat, lng, radius_m, qr_token, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,1)`,
    [id, req.user.company_id, name, lat != null ? Number(lat) : null, lng != null ? Number(lng) : null, Number(radius_m) || 150, token],
  )
  const data = await queryOne('SELECT * FROM attendance_locations WHERE id = $1', [id])
  res.json({ data })
}

export async function deleteAttendanceLocation(req: Request, res: Response): Promise<void> {
  await run('DELETE FROM attendance_locations WHERE id = $1 AND company_id = $2', [String(req.params.id), req.user.company_id])
  res.json({ success: true })
}

export async function clockInQr(req: Request, res: Response): Promise<void> {
  const { qr_token, lat, lng, shift_id } = req.body
  if (!qr_token) { res.status(400).json({ error: 'qr_token จำเป็น' }); return }
  const loc = await queryOne(
    'SELECT * FROM attendance_locations WHERE qr_token = $1 AND company_id = $2 AND active = 1',
    [qr_token, req.user.company_id],
  )
  if (!loc) { res.status(404).json({ error: 'QR ไม่ถูกต้องหรือหมดอายุ' }); return }

  if (loc.lat != null && loc.lng != null) {
    if (lat == null || lng == null) {
      res.status(400).json({ error: 'ต้องเปิด GPS เพื่อยืนยันตำแหน่ง' }); return
    }
    const dist = distanceMeters(Number(lat), Number(lng), Number(loc.lat), Number(loc.lng))
    if (dist > Number(loc.radius_m || 150)) {
      res.status(400).json({ error: `อยู่นอกพื้นที่ลงเวลา (${Math.round(dist)}m > ${loc.radius_m}m)` }); return
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 8)
  const existing = await queryOne(
    'SELECT * FROM time_attendance WHERE company_id = $1 AND user_id = $2 AND work_date = $3',
    [req.user.company_id, req.user.id, today],
  )
  if (existing?.clock_in) { res.status(400).json({ error: 'ลงเวลาเข้าแล้ววันนี้' }); return }

  const id = existing?.id || newId()
  if (existing) {
    await run(
      `UPDATE time_attendance SET clock_in = $1, source = 'qr', shift_id = $2, qr_location_id = $3, clock_in_lat = $4, clock_in_lng = $5, lat = $4, lng = $5 WHERE id = $6`,
      [now, shift_id || null, loc.id, lat != null ? Number(lat) : null, lng != null ? Number(lng) : null, id],
    )
  } else {
    await run(
      `INSERT INTO time_attendance (id, company_id, user_id, work_date, clock_in, source, shift_id, qr_location_id, clock_in_lat, clock_in_lng, lat, lng)
       VALUES ($1,$2,$3,$4,$5,'qr',$6,$7,$8,$9,$8,$9)`,
      [id, req.user.company_id, req.user.id, today, now, shift_id || null, loc.id, lat != null ? Number(lat) : null, lng != null ? Number(lng) : null],
    )
  }
  res.json({ success: true, location: loc.name })
}

// ── Shifts CRUD ──────────────────────────────────────────────────
export async function createShift(req: Request, res: Response): Promise<void> {
  const { code, name, start_time, end_time, break_minutes, shift_value } = req.body
  if (!code || !name) { res.status(400).json({ error: 'กรอก code และ name' }); return }
  const id = newId()
  await run(
    `INSERT INTO work_shifts (id, company_id, code, name, start_time, end_time, break_minutes, shift_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.company_id, code, name, start_time || '09:00', end_time || '18:00', Number(break_minutes) || 60, Number(shift_value) || 0],
  )
  res.json({ data: await queryOne('SELECT * FROM work_shifts WHERE id = $1', [id]) })
}

export async function updateShift(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id)
  const { name, start_time, end_time, break_minutes, shift_value } = req.body
  await run(
    `UPDATE work_shifts SET name = COALESCE($1, name), start_time = COALESCE($2, start_time),
     end_time = COALESCE($3, end_time), break_minutes = COALESCE($4, break_minutes), shift_value = COALESCE($5, shift_value)
     WHERE id = $6 AND company_id = $7`,
    [name, start_time, end_time, break_minutes != null ? Number(break_minutes) : null, shift_value != null ? Number(shift_value) : null, id, req.user.company_id],
  )
  res.json({ success: true })
}

// ── OT multi-step approval ───────────────────────────────────────
async function initOtSteps(companyId: string, otId: string) {
  for (const step of DEFAULT_OT_APPROVAL_CHAIN) {
    await run(
      `INSERT INTO ot_approval_steps (id, ot_request_id, company_id, level, approver_role, label_th, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [newId(), otId, companyId, step.level, step.role, step.label_th],
    )
  }
}

export async function createOtRequestV2(req: Request, res: Response): Promise<void> {
  const { work_date, hours, ot_type_id, reason, user_id } = req.body
  if (!work_date || !hours || !ot_type_id) {
    res.status(400).json({ error: 'work_date, hours, ot_type_id จำเป็น' }); return
  }
  const id = newId()
  await run(
    `INSERT INTO overtime_requests (id, company_id, user_id, work_date, hours, ot_type_id, reason, status, approval_level, required_levels)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',0,$8)`,
    [id, req.user.company_id, user_id || req.user.id, work_date, Number(hours), ot_type_id, reason || '', DEFAULT_OT_APPROVAL_CHAIN.length],
  )
  await initOtSteps(req.user.company_id, id)
  res.json({ data: await queryOne('SELECT * FROM overtime_requests WHERE id = $1', [id]) })
}

export async function listOtRequestsV2(req: Request, res: Response): Promise<void> {
  const role = (req.user.role || 'staff').toLowerCase()
  let sql = `SELECT o.*, u.name as employee_name, t.name as ot_type_name, t.multiplier
    FROM overtime_requests o JOIN users u ON u.id = o.user_id
    LEFT JOIN overtime_types t ON t.id = o.ot_type_id WHERE o.company_id = $1`
  const params: any[] = [req.user.company_id]
  if (role === 'staff') { sql += ' AND o.user_id = $2'; params.push(req.user.id) }
  sql += ' ORDER BY o.created_at DESC'
  const rows = await queryAll(sql, params)
  const withSteps = await Promise.all(rows.map(async (o: any) => {
    const steps = await queryAll('SELECT * FROM ot_approval_steps WHERE ot_request_id = $1 ORDER BY level', [o.id])
    return { ...o, approval_steps: steps }
  }))
  res.json({ data: withSteps })
}

export async function approveOtStep(req: Request, res: Response): Promise<void> {
  const otId = String(req.params.id)
  const { action, note } = req.body as { action: 'approve' | 'reject'; note?: string }
  const role = (req.user.role || 'staff').toLowerCase()
  if (!['admin', 'hr', 'finance'].includes(role)) {
    res.status(403).json({ error: 'ไม่มีสิทธิ์อนุมัติ OT' }); return
  }

  const ot = await queryOne('SELECT * FROM overtime_requests WHERE id = $1 AND company_id = $2', [otId, req.user.company_id])
  if (!ot) { res.status(404).json({ error: 'ไม่พบคำขอ OT' }); return }
  if (ot.status === 'approved' || ot.status === 'rejected') {
    res.status(400).json({ error: 'คำขอถูกดำเนินการแล้ว' }); return
  }

  const currentLevel = Number(ot.approval_level || 0) + 1
  const step = await queryOne(
    'SELECT * FROM ot_approval_steps WHERE ot_request_id = $1 AND level = $2',
    [otId, currentLevel],
  )
  if (!step) { res.status(400).json({ error: 'ไม่มีขั้นตอนอนุมัติ' }); return }
  if (role !== 'admin' && step.approver_role !== role) {
    res.status(403).json({ error: `ขั้นตอนนี้ต้องอนุมัติโดย ${step.approver_role}` }); return
  }

  if (action === 'reject') {
    await run(`UPDATE ot_approval_steps SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, note = $2 WHERE id = $3`,
      [req.user.id, note || '', step.id])
    await run(`UPDATE overtime_requests SET status = 'rejected', approved_by = $1 WHERE id = $2`, [req.user.id, otId])
    res.json({ success: true, status: 'rejected' })
    return
  }

  await run(`UPDATE ot_approval_steps SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, note = $2 WHERE id = $3`,
    [req.user.id, note || '', step.id])

  const required = Number(ot.required_levels || DEFAULT_OT_APPROVAL_CHAIN.length)
  if (currentLevel >= required) {
    await run(`UPDATE overtime_requests SET status = 'approved', approval_level = $1, approved_by = $2 WHERE id = $3`,
      [currentLevel, req.user.id, otId])
    res.json({ success: true, status: 'approved' })
    return
  }
  await run('UPDATE overtime_requests SET approval_level = $1 WHERE id = $2', [currentLevel, otId])
  res.json({ success: true, status: 'pending', level: currentLevel })
}

// ── Tax / SSO official-style HTML export ─────────────────────────
function taxFormHtml(title: string, companyName: string, periodLabel: string, rows: string, footer: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:'Sarabun',sans-serif;padding:24px;font-size:12px}
  h1{font-size:16px;text-align:center} h2{font-size:13px;text-align:center;color:#444}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{border:1px solid #333;padding:6px 8px} th{background:#f0f0f0}
  .meta{margin:12px 0;line-height:1.8}
  .foot{margin-top:24px;font-size:10px;color:#666}
</style></head>
<body>
<h1>${title}</h1>
<h2>${companyName}</h2>
<div class="meta">งวด: ${periodLabel}</div>
<table><thead>${rows.includes('<th>') ? '' : '<tr><th>ลำดับ</th><th>รายการ</th><th style="text-align:right">จำนวนเงิน</th></tr>'}</thead>
<tbody>${rows}</tbody></table>
<div class="foot">${footer}</div>
<script>window.onload=()=>window.print()</script>
</body></html>`
}

export async function exportTaxForm(req: Request, res: Response): Promise<void> {
  const type = String(req.params.type)
  const periodId = String(req.query.period_id || '')
  if (!periodId) { res.status(400).json({ error: 'ระบุ period_id' }); return }

  const period = await queryOne('SELECT * FROM payroll_periods WHERE id = $1 AND company_id = $2', [periodId, req.user.company_id])
  if (!period) { res.status(404).json({ error: 'ไม่พบงวด' }); return }
  const company = await queryOne('SELECT * FROM companies WHERE id = $1', [req.user.company_id])
  const slips = await queryAll(
    `SELECT p.*, u.name, u.department, ep.personal_tax_id, ep.employee_code
     FROM payslips p JOIN users u ON u.id = p.user_id
     LEFT JOIN employee_profiles ep ON ep.user_id = p.user_id
     WHERE p.period_id = $1 ORDER BY u.name`,
    [periodId],
  )
  const periodLabel = `${period.month}/${period.year}`
  const companyName = company?.name || 'บริษัท'

  let title = ''
  let rows = ''
  let footer = 'เอกสารนี้สร้างจาก NEXUS OS — ตรวจสอบกับแบบฟอร์มทางการก่อนยื่น'

  if (type === 'pnd1') {
    title = 'แบบ ภงด.1 — ภาษีหัก ณ ที่จ่าย (เงินได้พึงประเมิน)'
    rows = slips.map((s: any, i: number) =>
      `<tr><td>${i + 1}</td><td>${s.name} (${s.employee_code || '—'})<br><small>เลขผู้เสียภาษี: ${s.personal_tax_id || '—'}</small></td><td style="text-align:right">฿${Number(s.tax_wht).toLocaleString()}</td></tr>`,
    ).join('')
    const total = slips.reduce((a: number, s: any) => a + Number(s.tax_wht || 0), 0)
    rows += `<tr><td colspan="2"><strong>รวมภาษีหัก ณ ที่จ่าย</strong></td><td style="text-align:right"><strong>฿${total.toLocaleString()}</strong></td></tr>`
  } else if (type === 'pnd1k') {
    title = 'แบบ ภงด.1ก — สรุปการหักภาษี ณ ที่จ่าย (รายปี)'
    const annual = slips.reduce((a: number, s: any) => a + Number(s.gross || 0), 0) * 12
    const taxAnnual = slips.reduce((a: number, s: any) => a + Number(s.tax_wht || 0), 0) * 12
    rows = `<tr><td>1</td><td>เงินได้รวม (ประมาณการรายปี)</td><td style="text-align:right">฿${annual.toLocaleString()}</td></tr>
      <tr><td>2</td><td>ภาษีหัก ณ ที่จ่ายรวม (ประมาณการรายปี)</td><td style="text-align:right">฿${taxAnnual.toLocaleString()}</td></tr>
      <tr><td>3</td><td>จำนวนผู้มีเงินได้</td><td style="text-align:right">${slips.length} คน</td></tr>`
  } else if (type === 'pnd3') {
    title = 'แบบ ภงด.3 — ภาษีหัก ณ ที่จ่าย (เงินได้ตามมาตรา 40(2))'
    rows = slips.map((s: any, i: number) =>
      `<tr><td>${i + 1}</td><td>${s.name}</td><td style="text-align:right">฿${Number(s.tax_wht).toLocaleString()}</td></tr>`,
    ).join('') || '<tr><td colspan="3">ไม่มีรายการ</td></tr>'
  } else if (type === 'kt20') {
    title = 'แบบ กท.20 — รายงานการนำส่งเงินสมทบประกันสังคม'
    rows = slips.map((s: any, i: number) =>
      `<tr><td>${i + 1}</td><td>${s.name}<br><small>${s.department || ''}</small></td>
       <td style="text-align:right">฿${Number(s.sso_employee).toLocaleString()}</td>
       <td style="text-align:right">฿${Number(s.sso_employer || s.sso_employee).toLocaleString()}</td></tr>`,
    ).join('')
    const empTotal = slips.reduce((a: number, s: any) => a + Number(s.sso_employee || 0), 0)
    const erTotal = slips.reduce((a: number, s: any) => a + Number(s.sso_employer || s.sso_employee || 0), 0)
    rows = `<tr><th>ลำดับ</th><th>ชื่อพนักงาน</th><th>ลูกจ้าง</th><th>นายจ้าง</th></tr>` + rows +
      `<tr><td colspan="2"><strong>รวม</strong></td><td style="text-align:right"><strong>฿${empTotal.toLocaleString()}</strong></td><td style="text-align:right"><strong>฿${erTotal.toLocaleString()}</strong></td></tr>`
  } else if (type === 'sso-monthly') {
    title = 'รายงานประกันสังคมประจำเดือน'
    rows = slips.map((s: any, i: number) =>
      `<tr><td>${i + 1}</td><td>${s.name}</td><td style="text-align:right">฿${Number(s.sso_employee).toLocaleString()}</td></tr>`,
    ).join('')
  } else {
    res.status(404).json({ error: 'ไม่รองรับแบบฟอร์มนี้' }); return
  }

  const html = taxFormHtml(title, companyName, periodLabel, rows, footer)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function unassignPermissionGroup(req: Request, res: Response): Promise<void> {
  const { user_id } = req.body
  if (!user_id) { res.status(400).json({ error: 'ระบุ user_id' }); return }
  await run(
    'DELETE FROM user_permission_groups WHERE user_id = $1 AND group_id = $2',
    [user_id, String(req.params.id)],
  )
  res.json({ success: true })
}

export async function listGroupMembers(req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    `SELECT u.id, u.name, u.email, u.role FROM user_permission_groups upg
     JOIN users u ON u.id = upg.user_id WHERE upg.group_id = $1`,
    [String(req.params.id)],
  )
  res.json({ data: rows })
}

export { APPROVE_FLAG, DEFAULT_LEAVE_APPROVAL_CONFIG }
