import { api } from './api'

async function latestPeriod() {
  try {
    const res = await api.getPayrollPeriods()
    return res.data?.[0] || null
  } catch {
    return null
  }
}

async function hrReportRows(type: string, map: (rows: any[]) => ReportRow[]): Promise<Omit<ReportData, 'columns'> & { rows: ReportRow[] } | null> {
  const period = await latestPeriod()
  if (!period) return null
  try {
    const res = await api.getHrReport(type, { period_id: period.id, year: period.year, month: period.month })
    const rows = res.data || []
    if (!rows.length) return null
    return { rows: map(rows), stats: [{ label: 'งวด', value: `${period.year}/${period.month}` }, { label: 'รายการ', value: rows.length }], note: 'จาก Payroll Engine' }
  } catch {
    return null
  }
}

export type ReportColumn = { key: string; label: string; align?: 'left' | 'right' }
export type ReportStat = { label: string; value: string | number }
export type ReportRow = Record<string, string | number>

export type ReportData = {
  columns: ReportColumn[]
  rows: ReportRow[]
  stats?: ReportStat[]
  note?: string
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function fmtMoney(v: number): string {
  return v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthKey(d: string | Date): string {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

async function employees() {
  const res = await api.getEmployees()
  return res.data || []
}

export async function loadPeopleRegistry(): Promise<ReportData> {
  try {
    const res = await api.getHrReport('people-registry')
    const data = res.data || []
    if (data.length) {
      return {
        stats: [{ label: 'พนักงานทั้งหมด', value: data.length }],
        columns: [
          { key: 'name', label: 'ชื่อ-นามสกุล' },
          { key: 'email', label: 'อีเมล' },
          { key: 'department', label: 'แผนก' },
          { key: 'employee_code', label: 'รหัส' },
          { key: 'status', label: 'สถานะ' },
        ],
        rows: data.map((e: any) => ({
          name: e.name || '—',
          email: e.email || '—',
          department: e.department || '—',
          employee_code: e.employee_code || '—',
          status: e.status || '—',
        })),
      }
    }
  } catch { /* fallback */ }
  const data = await employees()
  return {
    stats: [
      { label: 'พนักงานทั้งหมด', value: data.length },
      { label: 'Active', value: data.filter((e: any) => e.status === 'active').length },
    ],
    columns: [
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'email', label: 'อีเมล' },
      { key: 'department', label: 'แผนก' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'สถานะ' },
    ],
    rows: data.map((e: any) => ({
      name: e.name || '—',
      email: e.email || '—',
      department: e.department || e.dept || '—',
      role: e.role || '—',
      status: e.status || '—',
    })),
  }
}

export async function loadSalaryChange(): Promise<ReportData> {
  const data = await employees()
  const total = data.reduce((s: number, e: any) => s + num(e.salary), 0)
  return {
    stats: [
      { label: 'พนักงาน', value: data.length },
      { label: 'เงินเดือนรวม/เดือน', value: `฿${fmtMoney(total)}` },
      { label: 'เฉลี่ย', value: data.length ? `฿${fmtMoney(total / data.length)}` : '—' },
    ],
    columns: [
      { key: 'name', label: 'ชื่อ' },
      { key: 'department', label: 'แผนก' },
      { key: 'salary', label: 'เงินเดือน (฿)', align: 'right' },
      { key: 'status', label: 'สถานะ' },
    ],
    rows: data.map((e: any) => ({
      name: e.name || '—',
      department: e.department || e.dept || '—',
      salary: fmtMoney(num(e.salary)),
      status: e.status || '—',
    })),
    note: 'ข้อมูลจากทะเบียนพนักงาน — ประวัติการเปลี่ยนแปลงรายงานเต็มจะมาใน Payroll Engine',
  }
}

export async function loadLeaveQuota(): Promise<ReportData> {
  const [emps, leaveRes] = await Promise.all([employees(), api.getLeaveRequests()])
  const leaves = leaveRes.data || []
  return {
    stats: [
      { label: 'คำขอลา', value: leaves.length },
      { label: 'รออนุมัติ', value: leaves.filter((l: any) => l.status === 'pending').length },
    ],
    columns: [
      { key: 'name', label: 'ชื่อ' },
      { key: 'used', label: 'ใช้ไป (วัน)', align: 'right' },
      { key: 'total', label: 'โควต้า (วัน)', align: 'right' },
      { key: 'remaining', label: 'คงเหลือ', align: 'right' },
    ],
    rows: emps.map((e: any) => {
      const used = num(e.leave_used)
      const total = num(e.leave_total) || 15
      return {
        name: e.name || '—',
        used,
        total,
        remaining: Math.max(total - used, 0),
      }
    }),
  }
}

export async function loadWorkLogsReport(mode: 'attendance' | 'calculation' | 'annual'): Promise<ReportData> {
  const logs = await api.getWorkLogs()
  const list = Array.isArray(logs) ? logs : []
  const year = new Date().getFullYear()

  if (mode === 'annual') {
    const byMonth: Record<string, number> = {}
    list.forEach((l: any) => {
      const k = monthKey(l.created_at || l.date || '')
      byMonth[k] = (byMonth[k] || 0) + 1
    })
    const rows = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count, year: month.startsWith(String(year)) ? year : '—' }))
    return {
      stats: [{ label: 'บันทึกงานทั้งปี', value: list.length }],
      columns: [
        { key: 'month', label: 'เดือน' },
        { key: 'count', label: 'จำนวนบันทึก', align: 'right' },
      ],
      rows,
      note: 'สรุปจาก Work Log — รายงานลงเวลาเต็มรูปแบบจะเชื่อม Time Attendance ใน Phase ถัดไป',
    }
  }

  if (mode === 'calculation') {
    const byDept: Record<string, { count: number; kpi: number }> = {}
    list.forEach((l: any) => {
      const d = l.department || '—'
      if (!byDept[d]) byDept[d] = { count: 0, kpi: 0 }
      byDept[d].count += 1
      byDept[d].kpi += num(l.kpi_impact)
    })
    return {
      stats: [{ label: 'บันทึกทั้งหมด', value: list.length }],
      columns: [
        { key: 'department', label: 'แผนก' },
        { key: 'count', label: 'จำนวนบันทึก', align: 'right' },
        { key: 'kpi', label: 'KPI Impact', align: 'right' },
      ],
      rows: Object.entries(byDept).map(([department, v]) => ({
        department,
        count: v.count,
        kpi: v.kpi,
      })),
    }
  }

  return {
    stats: [
      { label: 'บันทึกวันนี้', value: list.filter((l: any) => {
        const d = new Date(l.created_at || '')
        const t = new Date()
        return d.toDateString() === t.toDateString()
      }).length },
      { label: 'ทั้งหมด', value: list.length },
    ],
    columns: [
      { key: 'date', label: 'วันที่' },
      { key: 'name', label: 'พนักงาน' },
      { key: 'action', label: 'ประเภท' },
      { key: 'object', label: 'รายละเอียด' },
      { key: 'status', label: 'สถานะ' },
    ],
    rows: list.slice(0, 200).map((l: any) => ({
      date: (l.created_at || '').slice(0, 10) || '—',
      name: l.user_name || l.name || '—',
      action: l.action_type || '—',
      object: l.object || '—',
      status: l.status || '—',
    })),
  }
}

export async function loadPayrollReport(mode: 'period' | 'annual'): Promise<ReportData> {
  const hr = await hrReportRows(mode === 'annual' ? 'payroll-annual' : 'payroll-period', slips =>
    slips.map((s: any) => ({
      name: s.name || s.employee_name || '—',
      department: s.department || '—',
      gross: fmtMoney(Number(s.gross || 0)),
      sso: fmtMoney(Number(s.sso_employee || 0)),
      net: fmtMoney(Number(s.net || 0)),
    })),
  )
  if (hr?.rows.length) {
    return {
      ...hr,
      columns: [
        { key: 'name', label: 'ชื่อ' },
        { key: 'department', label: 'แผนก' },
        { key: 'gross', label: 'รายได้', align: 'right' },
        { key: 'sso', label: 'SSO', align: 'right' },
        { key: 'net', label: 'สุทธิ', align: 'right' },
      ],
    }
  }
  const data = await employees()
  const monthly = data.reduce((s: number, e: any) => s + num(e.salary), 0)
  const multiplier = mode === 'annual' ? 12 : 1
  const gross = monthly * multiplier
  const sso = gross * 0.05
  const net = gross - sso
  return {
    stats: [
      { label: mode === 'annual' ? 'เงินเดือนรวม/ปี' : 'เงินเดือนรวม/งวด', value: `฿${fmtMoney(gross)}` },
      { label: 'ประมาณ SSO 5%', value: `฿${fmtMoney(sso)}` },
      { label: 'ประมาณสุทธิ', value: `฿${fmtMoney(net)}` },
    ],
    columns: [
      { key: 'name', label: 'ชื่อ' },
      { key: 'department', label: 'แผนก' },
      { key: 'gross', label: mode === 'annual' ? 'รายได้/ปี' : 'รายได้', align: 'right' },
      { key: 'sso', label: 'SSO 5%', align: 'right' },
      { key: 'net', label: 'สุทธิโดยประมาณ', align: 'right' },
    ],
    rows: data.map((e: any) => {
      const g = num(e.salary) * multiplier
      const s = g * 0.05
      return {
        name: e.name || '—',
        department: e.department || e.dept || '—',
        gross: fmtMoney(g),
        sso: fmtMoney(s),
        net: fmtMoney(g - s),
      }
    }),
    note: 'คำนวณเบื้องต้นจากเงินเดือนทะเบียน — รายงานทางการภาษี/ประกันสังคมต้องใช้ Payroll Engine',
  }
}

export async function loadSsoReport(mode: 'monthly' | 'kt20'): Promise<ReportData> {
  const payroll = await loadPayrollReport('period')
  return {
    ...payroll,
    stats: [
      { label: mode === 'kt20' ? 'แบบ กท.20 (ประมาณ)' : 'SSO รายเดือน', value: payroll.stats?.[1]?.value || '—' },
      { label: 'จำนวนผู้ประกัน', value: payroll.rows.length },
    ],
    note: mode === 'kt20'
      ? 'สรุปเบื้องต้นสำหรับยื่น กท.20 — ต้องตรวจสอบกับไฟล์ทางการก่อนส่ง'
      : 'สรุปเงินสมทบประจำเดือนจากเงินเดือนทะเบียน',
  }
}

export async function loadTaxReport(form: 'pnd1' | 'pnd1k' | 'pnd3'): Promise<ReportData> {
  const data = await employees()
  const labels: Record<string, string> = {
    pnd1: 'ภงด.1 — หัก ณ ที่จ่าย (พนักงาน)',
    pnd1k: 'ภงด.1ก — สรุปรายปี',
    pnd3: 'ภงด.3 — หัก ณ ที่จ่าย (ผู้รับจ้าง)',
  }
  const rows = data.map((e: any) => {
    const salary = num(e.salary)
    const wht = salary * 0.03
    return {
      name: e.name || '—',
      tax_id: '—',
      income: fmtMoney(salary),
      wht: fmtMoney(wht),
    }
  })
  const totalWht = data.reduce((s: number, e: any) => s + num(e.salary) * 0.03, 0)
  return {
    stats: [
      { label: labels[form], value: data.length },
      { label: 'หัก ณ ที่จ่ายรวม (3%)', value: `฿${fmtMoney(totalWht)}` },
    ],
    columns: [
      { key: 'name', label: 'ชื่อ' },
      { key: 'tax_id', label: 'เลขผู้เสียภาษี' },
      { key: 'income', label: 'เงินได้', align: 'right' },
      { key: 'wht', label: 'หัก ณ ที่จ่าย', align: 'right' },
    ],
    rows,
    note: 'อัตราหัก ณ ที่จ่าย 3% เป็นตัวอย่าง — ต้องคำนวณตามอัตราจริงใน Payroll Engine',
  }
}

export async function loadAccountingReport(mode: 'net' | 'by-dept'): Promise<ReportData> {
  const data = await employees()
  if (mode === 'by-dept') {
    const byDept: Record<string, number> = {}
    data.forEach((e: any) => {
      const d = e.department || e.dept || '—'
      byDept[d] = (byDept[d] || 0) + num(e.salary)
    })
    const rows = Object.entries(byDept).map(([department, amount]) => ({
      department,
      headcount: data.filter((e: any) => (e.department || e.dept) === department).length,
      payroll: fmtMoney(amount),
    }))
    const total = Object.values(byDept).reduce((a, b) => a + b, 0)
    return {
      stats: [
        { label: 'แผนก', value: rows.length },
        { label: 'เงินเดือนรวม', value: `฿${fmtMoney(total)}` },
      ],
      columns: [
        { key: 'department', label: 'แผนก' },
        { key: 'headcount', label: 'จำนวนคน', align: 'right' },
        { key: 'payroll', label: 'เงินเดือน', align: 'right' },
      ],
      rows,
    }
  }
  return loadPayrollReport('period')
}

export function exportReportCsv(columns: ReportColumn[], rows: ReportRow[], filename: string) {
  const header = columns.map(c => c.label).join(',')
  const body = rows.map(row =>
    columns.map(c => {
      const v = String(row[c.key] ?? '')
      return v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(','),
  ).join('\n')
  const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
