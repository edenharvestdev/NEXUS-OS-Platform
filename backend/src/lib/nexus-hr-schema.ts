/** NEXUS HR Engine — Phases 0-4 schema (org, time, payroll, tax, SSO) */

export const NEXUS_HR_SQL = `
  CREATE TABLE IF NOT EXISTS org_units (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_id TEXT,
    level INTEGER DEFAULT 1,
    code TEXT NOT NULL,
    name_th TEXT NOT NULL,
    name_en TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, code)
  );
  CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, code)
  );
  CREATE TABLE IF NOT EXISTS employee_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_code TEXT,
    org_unit_id TEXT REFERENCES org_units(id),
    position_id TEXT REFERENCES positions(id),
    hire_date TEXT,
    terminate_date TEXT,
    bank_account TEXT,
    personal_tax_id TEXT,
    employee_type TEXT DEFAULT '01',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS permission_groups (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    modules TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_permission_groups (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
  );
  CREATE TABLE IF NOT EXISTS leave_types (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    quota_days INTEGER DEFAULT 0,
    paid INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, code)
  );
  CREATE TABLE IF NOT EXISTS work_shifts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    start_time TEXT DEFAULT '09:00',
    end_time TEXT DEFAULT '18:00',
    break_minutes INTEGER DEFAULT 60,
    shift_value REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, code)
  );
  CREATE TABLE IF NOT EXISTS time_attendance (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    work_date TEXT NOT NULL,
    clock_in TEXT,
    clock_out TEXT,
    source TEXT DEFAULT 'manual',
    shift_id TEXT REFERENCES work_shifts(id),
    hours_worked REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS salary_advances (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payroll_settings (
    company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    work_days_per_month INTEGER DEFAULT 26,
    hours_per_day REAL DEFAULT 8,
    sso_employee_rate REAL DEFAULT 0.05,
    sso_employer_rate REAL DEFAULT 0.05,
    sso_salary_cap REAL DEFAULT 15000,
    tax_method TEXT DEFAULT 'progressive',
    pay_rounds INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payroll_periods (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, year, month)
  );
  CREATE TABLE IF NOT EXISTS employee_daily_calendar (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    period_id TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    work_date TEXT NOT NULL,
    day_type TEXT DEFAULT 'workday',
    shift_id TEXT,
    hours_worked REAL DEFAULT 0,
    absence_hours REAL DEFAULT 0,
    notes TEXT,
    UNIQUE(company_id, user_id, work_date)
  );
  CREATE TABLE IF NOT EXISTS payroll_items (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    period_id TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('income','deduction')),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payroll_runs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_id TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    calculated_at TEXT,
    finished_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payslips (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    period_id TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    gross REAL DEFAULT 0,
    deductions REAL DEFAULT 0,
    net REAL DEFAULT 0,
    sso_employee REAL DEFAULT 0,
    sso_employer REAL DEFAULT 0,
    tax_wht REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, user_id, period_id)
  );
  CREATE TABLE IF NOT EXISTS salary_history (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    old_salary REAL DEFAULT 0,
    new_salary REAL NOT NULL,
    effective_date TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`

export const NEXUS_HR_PG = NEXUS_HR_SQL
  .replace(/datetime\('now'\)/g, 'NOW()')
  .replace(/INTEGER DEFAULT 1/g, 'INTEGER DEFAULT 1')
  .replace(/REAL/g, 'NUMERIC')

export const DEFAULT_LEAVE_TYPES = [
  { code: '01', name: 'ลาพักร้อน', quota_days: 6, paid: 1 },
  { code: '02', name: 'ลาป่วย', quota_days: 30, paid: 1 },
  { code: '03', name: 'ลากิจ', quota_days: 3, paid: 1 },
  { code: '04', name: 'ลาคลอด', quota_days: 98, paid: 1 },
  { code: '05', name: 'ลาบวช', quota_days: 15, paid: 0 },
]

export const DEFAULT_SHIFTS = [
  { code: 'NORM', name: 'กะปกติ', start_time: '09:00', end_time: '18:00', break_minutes: 60 },
  { code: 'MORN', name: 'กะเช้า', start_time: '08:00', end_time: '17:00', break_minutes: 60 },
  { code: 'EVEN', name: 'กะบ่าย', start_time: '13:00', end_time: '22:00', break_minutes: 60 },
  { code: 'NIGHT', name: 'กะดึก', start_time: '22:00', end_time: '07:00', break_minutes: 60 },
  { code: 'HALF', name: 'กะครึ่งวัน', start_time: '09:00', end_time: '13:00', break_minutes: 0 },
  { code: 'FLEX', name: 'กะยืดหยุ่น', start_time: '09:00', end_time: '18:00', break_minutes: 60 },
]
