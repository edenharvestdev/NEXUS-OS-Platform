import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'
import { decryptField, encryptField } from '../lib/encryption'
import { ensureHrDefaults, syncEmployeeProfiles } from '../lib/hr-init'
import {
  calculatePayslip,
  countWorkDaysInMonth,
  detectAnomalies,
  monthDateRange,
  DEFAULT_PAYROLL_SETTINGS,
  calculateDailyRate,
  calculateHourlyRate,
  calculateOT,
} from '../lib/payroll-engine'
import { distanceMeters } from '../lib/geo'
import { MODULE_ACCESS } from '../lib/rbac'

async function boot(companyId: string) {
  await ensureHrDefaults(companyId)
  await syncEmployeeProfiles(companyId)
}

function num(v: unknown): number {
  const n = Number(decryptField(String(v ?? '')) || v)
  return Number.isFinite(n) ? n : 0
}

// ── Org ──────────────────────────────────────────────────────────
export async function getOrgUnits(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const rows = await queryAll(
    'SELECT * FROM org_units WHERE company_id = $1 ORDER BY level, name_th',
    [req.user.company_id],
  )
  res.json({ data: rows })
}

export async function createOrgUnit(req: Request, res: Response): Promise<void> {
  const { parent_id, level, code, name_th, name_en } = req.body
  if (!code || !name_th) { res.status(400).json({ error: 'กรอก code และ name_th' }); return }
  const id = newId()
  await run(
    `INSERT INTO org_units (id, company_id, parent_id, level, code, name_th, name_en) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, req.user.company_id, parent_id || null, level || 2, code, name_th, name_en || name_th],
  )
  const data = await queryOne('SELECT * FROM org_units WHERE id = $1', [id])
  res.json({ data })
}

export async function getPositions(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const rows = await queryAll('SELECT * FROM positions WHERE company_id = $1 ORDER BY name', [req.user.company_id])
  res.json({ data: rows })
}

// ── Permission Groups (Phase 0) ─────────────────────────────────
export async function getPermissionGroups(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const rows = await queryAll('SELECT * FROM permission_groups WHERE company_id = $1 ORDER BY name', [req.user.company_id])
  res.json({ data: rows.map((g: any) => ({ ...g, modules: JSON.parse(g.modules || '[]') })) })
}

export async function createPermissionGroup(req: Request, res: Response): Promise<void> {
  const { name, modules } = req.body
  if (!name) { res.status(400).json({ error: 'กรอกชื่อกลุ่ม' }); return }
  const id = newId()
  await run(
    `INSERT INTO permission_groups (id, company_id, name, modules) VALUES ($1,$2,$3,$4)`,
    [id, req.user.company_id, name, JSON.stringify(modules || [])],
  )
  res.json({ data: { id, name, modules: modules || [] } })
}

export async function updatePermissionGroup(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { name, modules } = req.body
  await run(
    `UPDATE permission_groups SET name = COALESCE($1, name), modules = COALESCE($2, modules) WHERE id = $3 AND company_id = $4`,
    [name, modules ? JSON.stringify(modules) : null, id, req.user.company_id],
  )
  res.json({ success: true })
}

export async function assignPermissionGroup(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { user_id } = req.body
  if (!user_id) { res.status(400).json({ error: 'ระบุ user_id' }); return }
  await run(
    `INSERT INTO user_permission_groups (user_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [user_id, id],
  )
  res.json({ success: true })
}

export async function getRbacMatrix(_req: Request, res: Response): Promise<void> {
  res.json({ roles: Object.keys(MODULE_ACCESS), modules: MODULE_ACCESS })
}

// ── Leave types & Shifts ─────────────────────────────────────────
export async function getLeaveTypes(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const rows = await queryAll('SELECT * FROM leave_types WHERE company_id = $1 ORDER BY code', [req.user.company_id])
  res.json({ data: rows })
}

export async function getShifts(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const rows = await queryAll('SELECT * FROM work_shifts WHERE company_id = $1 ORDER BY code', [req.user.company_id])
  res.json({ data: rows })
}

// ── Attendance (Phase 2) ─────────────────────────────────────────
export async function clockIn(req: Request, res: Response): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 8)
  const existing = await queryOne(
    `SELECT * FROM time_attendance WHERE company_id = $1 AND user_id = $2 AND work_date = $3`,
    [req.user.company_id, req.user.id, today],
  )
  if (existing?.clock_in) { res.status(400).json({ error: 'ลงเวลาเข้าแล้ววันนี้' }); return }
  const lat = req.body.lat != null ? Number(req.body.lat) : null
  const lng = req.body.lng != null ? Number(req.body.lng) : null

  const geoLocs = await queryAll(
    'SELECT * FROM attendance_locations WHERE company_id = $1 AND active = 1 AND lat IS NOT NULL',
    [req.user.company_id],
  )
  if (geoLocs.length > 0) {
    if (lat == null || lng == null) {
      res.status(400).json({ error: 'องค์กรกำหนดพื้นที่ลงเวลา — ต้องเปิด GPS' }); return
    }
    const inRange = geoLocs.some((loc: any) =>
      distanceMeters(lat, lng, Number(loc.lat), Number(loc.lng)) <= Number(loc.radius_m || 150),
    )
    if (!inRange) { res.status(400).json({ error: 'อยู่นอกพื้นที่ลงเวลาที่กำหนด' }); return
    }
  }

  const source = req.body.source || (lat != null ? 'gps' : 'manual')
  const id = existing?.id || newId()
  if (existing) {
    await run(`UPDATE time_attendance SET clock_in = $1, source = $2, lat = $3, lng = $4 WHERE id = $5`, [now, source, lat, lng, id])
  } else {
    await run(
      `INSERT INTO time_attendance (id, company_id, user_id, work_date, clock_in, source, shift_id, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, req.user.company_id, req.user.id, today, now, source, req.body.shift_id || null, lat, lng],
    )
  }
  const data = await queryOne('SELECT * FROM time_attendance WHERE id = $1', [id])
  res.json({ data })
}

export async function clockOut(req: Request, res: Response): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 8)
  const row = await queryOne(
    `SELECT * FROM time_attendance WHERE company_id = $1 AND user_id = $2 AND work_date = $3`,
    [req.user.company_id, req.user.id, today],
  )
  if (!row?.clock_in) { res.status(400).json({ error: 'ยังไม่ได้ลงเวลาเข้า' }); return }
  const [ih, im] = row.clock_in.split(':').map(Number)
  const [oh, om] = now.split(':').map(Number)
  const hours = Math.max(((oh * 60 + om) - (ih * 60 + im)) / 60, 0)
  await run(`UPDATE time_attendance SET clock_out = $1, hours_worked = $2 WHERE id = $3`, [now, hours, row.id])
  const data = await queryOne('SELECT * FROM time_attendance WHERE id = $1', [row.id])
  res.json({ data })
}

export async function listAttendance(req: Request, res: Response): Promise<void> {
  const { user_id, from, to } = req.query as Record<string, string>
  const params: any[] = [req.user.company_id]
  let sql = `SELECT t.*, u.name as employee_name FROM time_attendance t JOIN users u ON u.id = t.user_id WHERE t.company_id = $1`
  if (user_id) { params.push(user_id); sql += ` AND t.user_id = $${params.length}` }
  if (from) { params.push(from); sql += ` AND t.work_date >= $${params.length}` }
  if (to) { params.push(to); sql += ` AND t.work_date <= $${params.length}` }
  sql += ' ORDER BY t.work_date DESC LIMIT 500'
  const rows = await queryAll(sql, params)
  res.json({ data: rows })
}

// ── Advances (Phase 2) ───────────────────────────────────────────
export async function listAdvances(req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    `SELECT a.*, u.name as employee_name FROM salary_advances a JOIN users u ON u.id = a.user_id
     WHERE a.company_id = $1 ORDER BY a.created_at DESC`,
    [req.user.company_id],
  )
  res.json({ data: rows })
}

export async function createAdvance(req: Request, res: Response): Promise<void> {
  const { amount, reason, user_id } = req.body
  if (!amount) { res.status(400).json({ error: 'ระบุจำนวนเงิน' }); return }
  const id = newId()
  await run(
    `INSERT INTO salary_advances (id, company_id, user_id, amount, reason, status) VALUES ($1,$2,$3,$4,$5,'pending')`,
    [id, req.user.company_id, user_id || req.user.id, Number(amount), reason || ''],
  )
  const data = await queryOne('SELECT * FROM salary_advances WHERE id = $1', [id])
  res.json({ data })
}

export async function reviewAdvance(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { status } = req.body
  if (!['approved', 'rejected'].includes(status)) { res.status(400).json({ error: 'status ไม่ถูกต้อง' }); return }
  await run(
    `UPDATE salary_advances SET status = $1, approved_by = $2 WHERE id = $3 AND company_id = $4`,
    [status, req.user.id, id, req.user.company_id],
  )
  res.json({ success: true })
}

// ── Payroll settings & periods (Phase 3) ─────────────────────────
export async function getPayrollSettings(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const row = await queryOne('SELECT * FROM payroll_settings WHERE company_id = $1', [req.user.company_id])
  res.json({ data: row || DEFAULT_PAYROLL_SETTINGS })
}

export async function updatePayrollSettings(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const b = req.body
  await run(
    `UPDATE payroll_settings SET
      work_days_per_month = COALESCE($1, work_days_per_month),
      hours_per_day = COALESCE($2, hours_per_day),
      sso_employee_rate = COALESCE($3, sso_employee_rate),
      sso_employer_rate = COALESCE($4, sso_employer_rate),
      sso_salary_cap = COALESCE($5, sso_salary_cap),
      pay_rounds = COALESCE($6, pay_rounds),
      updated_at = CURRENT_TIMESTAMP
     WHERE company_id = $7`,
    [b.work_days_per_month, b.hours_per_day, b.sso_employee_rate, b.sso_employer_rate, b.sso_salary_cap, b.pay_rounds, req.user.company_id],
  )
  const data = await queryOne('SELECT * FROM payroll_settings WHERE company_id = $1', [req.user.company_id])
  res.json({ data })
}

export async function listPeriods(req: Request, res: Response): Promise<void> {
  await boot(req.user.company_id)
  const rows = await queryAll(
    'SELECT * FROM payroll_periods WHERE company_id = $1 ORDER BY year DESC, month DESC',
    [req.user.company_id],
  )
  res.json({ data: rows })
}

export async function createPeriod(req: Request, res: Response): Promise<void> {
  const year = Number(req.body.year) || new Date().getFullYear()
  const month = Number(req.body.month) || new Date().getMonth() + 1
  const { start, end } = monthDateRange(year, month)
  const id = newId()
  try {
    await run(
      `INSERT INTO payroll_periods (id, company_id, year, month, start_date, end_date, status) VALUES ($1,$2,$3,$4,$5,$6,'open')`,
      [id, req.user.company_id, year, month, start, end],
    )
  } catch {
    res.status(400).json({ error: 'งวดนี้มีอยู่แล้ว' }); return
  }
  const data = await queryOne('SELECT * FROM payroll_periods WHERE id = $1', [id])
  res.json({ data })
}

export async function getPeriodDashboard(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const period = await queryOne('SELECT * FROM payroll_periods WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!period) { res.status(404).json({ error: 'ไม่พบงวด' }); return }
  const payslips = await queryAll(
    `SELECT p.*, u.name as employee_name FROM payslips p JOIN users u ON u.id = p.user_id WHERE p.period_id = $1`,
    [id],
  )
  const anomalies = await queryAll(
    `SELECT edc.*, u.name as employee_name FROM employee_daily_calendar edc
     JOIN users u ON u.id = edc.user_id WHERE edc.period_id = $1 AND edc.absence_hours > 1`,
    [id],
  )
  res.json({
    period,
    summary: {
      employees: payslips.length,
      gross: payslips.reduce((s: number, p: any) => s + Number(p.gross || 0), 0),
      net: payslips.reduce((s: number, p: any) => s + Number(p.net || 0), 0),
      anomalies: anomalies.length,
    },
    payslips,
    anomalies,
  })
}

async function buildCalendarInternal(companyId: string, periodId: string): Promise<void> {
  const period = await queryOne('SELECT * FROM payroll_periods WHERE id = $1 AND company_id = $2', [periodId, companyId])
  if (!period) throw new Error('ไม่พบงวด')
  const settings = await queryOne('SELECT * FROM payroll_settings WHERE company_id = $1', [companyId])
  const users = await queryAll(`SELECT * FROM users WHERE company_id = $1 AND status = 'active'`, [companyId])
  const year = Number(period.year)
  const month = Number(period.month)
  const daysInMonth = new Date(year, month, 0).getDate()

  for (const u of users) {
    for (let d = 1; d <= daysInMonth; d++) {
      const workDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dow = new Date(year, month - 1, d).getDay()
      const dayType = dow === 0 || dow === 6 ? 'weekly_off' : 'workday'
      const att = await queryOne(
        `SELECT * FROM time_attendance WHERE company_id = $1 AND user_id = $2 AND work_date = $3`,
        [companyId, u.id, workDate],
      )
      const hours = Number(att?.hours_worked || 0)
      const expected = Number(settings?.hours_per_day || 8)
      const absence = dayType === 'workday' && hours < expected ? expected - hours : 0
      const existing = await queryOne(
        `SELECT id FROM employee_daily_calendar WHERE company_id = $1 AND user_id = $2 AND work_date = $3`,
        [companyId, u.id, workDate],
      )
      if (existing) {
        await run(
          `UPDATE employee_daily_calendar SET period_id = $1, day_type = $2, hours_worked = $3, absence_hours = $4, notes = $5 WHERE id = $6`,
          [periodId, dayType, hours, absence, att ? '' : (dayType === 'workday' ? 'no_attendance' : ''), existing.id],
        )
      } else {
        await run(
          `INSERT INTO employee_daily_calendar (id, company_id, user_id, period_id, work_date, day_type, hours_worked, absence_hours, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [newId(), companyId, u.id, periodId, workDate, dayType, hours, absence, att ? '' : (dayType === 'workday' ? 'no_attendance' : '')],
        )
      }
    }
  }
}

export async function buildCalendar(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id)
  try {
    await buildCalendarInternal(req.user.company_id, id)
    res.json({ success: true, message: 'สร้างปฏิทินรายวันแล้ว' })
  } catch (e: any) {
    res.status(404).json({ error: e.message })
  }
}

export async function calculatePeriod(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id)
  const period = await queryOne('SELECT * FROM payroll_periods WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!period) { res.status(404).json({ error: 'ไม่พบงวด' }); return }
  if (period.status === 'closed') { res.status(400).json({ error: 'งวดปิดแล้ว' }); return }

  await buildCalendarInternal(req.user.company_id, id)

  const settingsRow = await queryOne('SELECT * FROM payroll_settings WHERE company_id = $1', [req.user.company_id])
  const settings = { ...DEFAULT_PAYROLL_SETTINGS, ...settingsRow }
  const users = await queryAll(`SELECT * FROM users WHERE company_id = $1 AND status = 'active'`, [req.user.company_id])
  const workDays = countWorkDaysInMonth(Number(period.year), Number(period.month))
  const runId = newId()
  await run(
    `INSERT INTO payroll_runs (id, company_id, period_id, status, calculated_at) VALUES ($1,$2,$3,'calculated',CURRENT_TIMESTAMP)`,
    [runId, req.user.company_id, id],
  )

  for (const u of users) {
    const salary = num(u.salary)
    const calDays = await queryAll(
      `SELECT * FROM employee_daily_calendar WHERE period_id = $1 AND user_id = $2 AND day_type = 'workday'`,
      [id, u.id],
    )
    const daysWorked = calDays.filter((c: any) => Number(c.hours_worked) > 0).length || calDays.length
    const advanceRow = await queryOne(
      `SELECT COALESCE(SUM(amount),0) as total FROM salary_advances WHERE company_id = $1 AND user_id = $2 AND status = 'approved'`,
      [req.user.company_id, u.id],
    )
    const otRows = await queryAll(
      `SELECT o.hours, t.multiplier FROM overtime_requests o
       JOIN overtime_types t ON t.id = o.ot_type_id
       WHERE o.company_id = $1 AND o.user_id = $2 AND o.status = 'approved'
       AND o.work_date >= $3 AND o.work_date <= $4`,
      [req.user.company_id, u.id, period.start_date, period.end_date],
    )
    const daily = calculateDailyRate(salary, settings.work_days_per_month)
    const hourly = calculateHourlyRate(daily, settings.hours_per_day)
    let otPay = 0
    for (const o of otRows) {
      otPay += calculateOT(Number(o.hours) || 0, hourly, Number(o.multiplier) || 1.5)
    }
    const calc = calculatePayslip({
      userId: u.id,
      salary,
      daysWorked,
      totalWorkDays: workDays,
      advanceDeduction: Number(advanceRow?.total || 0),
      otherIncome: otPay,
    }, settings)

    await run(`DELETE FROM payroll_items WHERE period_id = $1 AND user_id = $2`, [id, u.id])
    for (const item of calc.items) {
      await run(
        `INSERT INTO payroll_items (id, company_id, user_id, period_id, item_type, code, name, amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [newId(), req.user.company_id, u.id, id, item.item_type, item.code, item.name, item.amount],
      )
    }

    const existingSlip = await queryOne(
      `SELECT id FROM payslips WHERE company_id = $1 AND user_id = $2 AND period_id = $3`,
      [req.user.company_id, u.id, id],
    )
    if (existingSlip) {
      await run(
        `UPDATE payslips SET gross = $1, deductions = $2, net = $3, sso_employee = $4, sso_employer = $5, tax_wht = $6, status = 'calculated' WHERE id = $7`,
        [calc.gross, calc.deductions, calc.net, calc.ssoEmployee, calc.ssoEmployer, calc.taxWht, existingSlip.id],
      )
    } else {
      await run(
        `INSERT INTO payslips (id, company_id, user_id, period_id, gross, deductions, net, sso_employee, sso_employer, tax_wht, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'calculated')`,
        [newId(), req.user.company_id, u.id, id, calc.gross, calc.deductions, calc.net, calc.ssoEmployee, calc.ssoEmployer, calc.taxWht],
      )
    }
  }

  await run(`UPDATE payroll_periods SET status = 'calculating' WHERE id = $1`, [id])
  res.json({ success: true, run_id: runId })
}

export async function finishPeriod(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  await run(`UPDATE payroll_periods SET status = 'closed' WHERE id = $1 AND company_id = $2`, [id, req.user.company_id])
  await run(
    `UPDATE payroll_runs SET status = 'finished', finished_at = CURRENT_TIMESTAMP WHERE period_id = $1 AND company_id = $2`,
    [id, req.user.company_id],
  )
  await run(`UPDATE payslips SET status = 'final' WHERE period_id = $1 AND company_id = $2`, [id, req.user.company_id])
  res.json({ success: true, message: 'ปิดงวดแล้ว — สลิปพร้อมใช้งาน' })
}

export async function getEmployeeCalendar(req: Request, res: Response): Promise<void> {
  const { userId } = req.params
  const { period_id } = req.query as { period_id?: string }
  const params: any[] = [req.user.company_id, userId]
  let sql = `SELECT * FROM employee_daily_calendar WHERE company_id = $1 AND user_id = $2`
  if (period_id) { params.push(period_id); sql += ` AND period_id = $${params.length}` }
  sql += ' ORDER BY work_date'
  const rows = await queryAll(sql, params)
  const settings = await queryOne('SELECT * FROM payroll_settings WHERE company_id = $1', [req.user.company_id])
  const expected = Number(settings?.hours_per_day || 8)
  const enriched = rows.map((r: any) => ({
    ...r,
    anomalies: detectAnomalies({
      dayType: r.day_type,
      clockIn: null,
      clockOut: null,
      hoursWorked: Number(r.hours_worked || 0),
      expectedHours: expected,
    }),
  }))
  res.json({ data: enriched })
}

export async function getPayslip(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.userId)
  const periodId = String(req.params.periodId)
  const slip = await queryOne(
    `SELECT p.*, u.name as employee_name FROM payslips p JOIN users u ON u.id = p.user_id
     WHERE p.company_id = $1 AND p.user_id = $2 AND p.period_id = $3`,
    [req.user.company_id, userId, periodId],
  )
  if (!slip) { res.status(404).json({ error: 'ไม่พบสลิป' }); return }
  const items = await queryAll(
    `SELECT * FROM payroll_items WHERE period_id = $1 AND user_id = $2 ORDER BY item_type, code`,
    [periodId, userId],
  )
  res.json({ data: { ...slip, items } })
}

// ── Reports API (Phase 4) ────────────────────────────────────────
export async function getHrReport(req: Request, res: Response): Promise<void> {
  const type = String(req.params.type)
  const { period_id, year, month } = req.query as Record<string, string>
  const companyId = req.user.company_id

  let period = period_id
    ? await queryOne('SELECT * FROM payroll_periods WHERE id = $1 AND company_id = $2', [period_id, companyId])
    : null
  if (!period && year && month) {
    period = await queryOne(
      'SELECT * FROM payroll_periods WHERE company_id = $1 AND year = $2 AND month = $3',
      [companyId, Number(year), Number(month)],
    )
  }

  if (['payroll-period', 'payroll-annual', 'sso-monthly', 'sso-kt20', 'tax-pnd1', 'tax-pnd1k', 'tax-pnd3', 'accounting-net', 'accounting-dept'].includes(type)) {
    if (!period) {
      res.status(400).json({ error: 'ระบุ period_id หรือ year+month และคำนวณงวดก่อน' }); return
    }
    const slips = await queryAll(
      `SELECT p.*, u.name, u.department FROM payslips p JOIN users u ON u.id = p.user_id WHERE p.period_id = $1`,
      [period.id],
    )
    if (type === 'accounting-dept') {
      const byDept: Record<string, { headcount: number; net: number }> = {}
      slips.forEach((s: any) => {
        const d = s.department || '—'
        if (!byDept[d]) byDept[d] = { headcount: 0, net: 0 }
        byDept[d].headcount++
        byDept[d].net += Number(s.net || 0)
      })
      res.json({ data: Object.entries(byDept).map(([department, v]) => ({ department, ...v })), period })
      return
    }
    res.json({ data: slips, period })
    return
  }

  if (type === 'people-registry') {
    const rows = await queryAll(
      `SELECT u.*, ep.employee_code, ep.hire_date FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id WHERE u.company_id = $1`,
      [companyId],
    )
    res.json({ data: rows })
    return
  }

  if (type === 'salary-change') {
    const rows = await queryAll(
      `SELECT sh.*, u.name FROM salary_history sh JOIN users u ON u.id = sh.user_id WHERE sh.company_id = $1 ORDER BY sh.effective_date DESC`,
      [companyId],
    )
    res.json({ data: rows })
    return
  }

  if (type === 'leave-quota') {
    const year = Number(req.query.year) || new Date().getFullYear()
    const rows = await queryAll(
      `SELECT q.*, u.name as employee_name, lt.name as leave_type, lt.code as leave_code
       FROM employee_leave_quota q
       JOIN users u ON u.id = q.user_id
       JOIN leave_types lt ON lt.id = q.leave_type_id
       WHERE q.company_id = $1 AND q.year = $2 ORDER BY u.name`,
      [companyId, year],
    )
    res.json({ data: rows })
    return
  }

  if (['time-attendance', 'time-calculation', 'time-annual'].includes(type)) {
    const rows = await queryAll(
      `SELECT t.*, u.name as employee_name FROM time_attendance t JOIN users u ON u.id = t.user_id WHERE t.company_id = $1 ORDER BY t.work_date DESC LIMIT 500`,
      [companyId],
    )
    res.json({ data: rows })
    return
  }

  res.status(404).json({ error: 'ไม่พบรายงาน' })
}

export async function recordSalaryChange(req: Request, res: Response): Promise<void> {
  const { user_id, new_salary, effective_date, note } = req.body
  const user = await queryOne('SELECT * FROM users WHERE id = $1 AND company_id = $2', [user_id, req.user.company_id])
  if (!user) { res.status(404).json({ error: 'ไม่พบพนักงาน' }); return }
  const oldSalary = num(user.salary)
  await run(`UPDATE users SET salary = $1 WHERE id = $2`, [encryptField(String(new_salary)), user_id])
  await run(
    `INSERT INTO salary_history (id, company_id, user_id, old_salary, new_salary, effective_date, note) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [newId(), req.user.company_id, user_id, oldSalary, Number(new_salary), effective_date || new Date().toISOString().slice(0, 10), note || ''],
  )
  res.json({ success: true })
}
