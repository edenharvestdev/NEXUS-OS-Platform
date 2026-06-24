/** NEXUS Payroll Engine — Phase 3-4 calculations (Thai HR rules, simplified) */

export type PayrollSettings = {
  work_days_per_month: number
  hours_per_day: number
  sso_employee_rate: number
  sso_employer_rate: number
  sso_salary_cap: number
  tax_method: string
  pay_rounds: number
}

export type EmployeePayInput = {
  userId: string
  salary: number
  daysWorked: number
  totalWorkDays: number
  otHours?: number
  otMultiplier?: number
  advanceDeduction?: number
  otherIncome?: number
  otherDeduction?: number
}

export type PayslipCalc = {
  gross: number
  ssoEmployee: number
  ssoEmployer: number
  taxWht: number
  deductions: number
  net: number
  items: Array<{ item_type: 'income' | 'deduction'; code: string; name: string; amount: number }>
  anomalies: string[]
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  work_days_per_month: 26,
  hours_per_day: 8,
  sso_employee_rate: 0.05,
  sso_employer_rate: 0.05,
  sso_salary_cap: 15000,
  tax_method: 'progressive',
  pay_rounds: 1,
}

export function calculateDailyRate(salary: number, workDays: number): number {
  if (!workDays || workDays <= 0) return 0
  return salary / workDays
}

export function calculateHourlyRate(dailyRate: number, hoursPerDay: number): number {
  if (!hoursPerDay || hoursPerDay <= 0) return 0
  return dailyRate / hoursPerDay
}

export function calculateProrata(salary: number, daysWorked: number, totalWorkDays: number): number {
  if (!totalWorkDays) return salary
  return (salary / totalWorkDays) * Math.min(daysWorked, totalWorkDays)
}

export function calculateOT(hours: number, hourlyRate: number, multiplier = 1.5): number {
  return hours * hourlyRate * multiplier
}

export function calculateSSO(
  gross: number,
  settings: PayrollSettings,
): { employee: number; employer: number; base: number } {
  const base = Math.min(gross, settings.sso_salary_cap)
  return {
    base,
    employee: base * settings.sso_employee_rate,
    employer: base * settings.sso_employer_rate,
  }
}

/** Thai progressive tax — annual brackets, return monthly WHT estimate */
export function calculateMonthlyTax(monthlyTaxable: number): number {
  const annual = monthlyTaxable * 12
  let tax = 0
  let remaining = annual

  const brackets = [
    { limit: 150000, rate: 0 },
    { limit: 300000, rate: 0.05 },
    { limit: 500000, rate: 0.10 },
    { limit: 750000, rate: 0.15 },
    { limit: 1000000, rate: 0.20 },
    { limit: 2000000, rate: 0.25 },
    { limit: 5000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ]

  let prev = 0
  for (const b of brackets) {
    const slice = Math.min(remaining, b.limit - prev)
    if (slice <= 0) break
    tax += slice * b.rate
    remaining -= slice
    prev = b.limit
    if (remaining <= 0) break
  }

  return tax / 12
}

export function detectAnomalies(input: {
  dayType: string
  clockIn?: string | null
  clockOut?: string | null
  hoursWorked: number
  expectedHours: number
}): string[] {
  const issues: string[] = []
  if (input.dayType === 'workday' && !input.clockIn && !input.clockOut) {
    issues.push('ไม่มาทำงานแต่เป็นวันทำงาน')
  }
  if (input.clockIn && !input.clockOut) {
    issues.push('ลงเวลาไม่ครบคู่ (มีเข้าไม่มีออก)')
  }
  if (input.hoursWorked > 0 && input.expectedHours - input.hoursWorked > 1) {
    issues.push('ชั่วโมงทำงานขาดเกิน 1 ชม.')
  }
  if (input.dayType === 'holiday' && input.hoursWorked > 0) {
    issues.push('มาทำงานในวันหยุด')
  }
  return issues
}

export function calculatePayslip(
  input: EmployeePayInput,
  settings: PayrollSettings = DEFAULT_PAYROLL_SETTINGS,
): PayslipCalc {
  const base = calculateProrata(input.salary, input.daysWorked, input.totalWorkDays)
  const daily = calculateDailyRate(input.salary, settings.work_days_per_month)
  const hourly = calculateHourlyRate(daily, settings.hours_per_day)
  const ot = calculateOT(input.otHours || 0, hourly, input.otMultiplier || 1.5)
  const otherIncome = input.otherIncome || 0
  const gross = base + ot + otherIncome

  const sso = calculateSSO(gross, settings)
  const taxable = Math.max(gross - sso.employee, 0)
  const taxWht = calculateMonthlyTax(taxable)
  const advance = input.advanceDeduction || 0
  const otherDed = input.otherDeduction || 0
  const deductions = sso.employee + taxWht + advance + otherDed
  const net = Math.max(gross - deductions, 0)

  const items: PayslipCalc['items'] = [
    { item_type: 'income', code: 'BASE', name: 'เงินเดือนพื้นฐาน', amount: base },
  ]
  if (ot > 0) items.push({ item_type: 'income', code: 'OT', name: 'ค่าล่วงเวลา', amount: ot })
  if (otherIncome > 0) items.push({ item_type: 'income', code: 'OTHER_IN', name: 'รายได้อื่น', amount: otherIncome })
  if (sso.employee > 0) items.push({ item_type: 'deduction', code: 'SSO', name: 'ประกันสังคม', amount: sso.employee })
  if (taxWht > 0) items.push({ item_type: 'deduction', code: 'TAX', name: 'ภาษีหัก ณ ที่จ่าย', amount: taxWht })
  if (advance > 0) items.push({ item_type: 'deduction', code: 'ADV', name: 'เบิกล่วงหน้า', amount: advance })
  if (otherDed > 0) items.push({ item_type: 'deduction', code: 'OTHER_OUT', name: 'หักอื่นๆ', amount: otherDed })

  return {
    gross,
    ssoEmployee: sso.employee,
    ssoEmployer: sso.employer,
    taxWht,
    deductions,
    net,
    items,
    anomalies: [],
  }
}

export function countWorkDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count || settingsFallbackWorkDays()
}

function settingsFallbackWorkDays(): number {
  return 26
}

export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  return { start, end }
}
