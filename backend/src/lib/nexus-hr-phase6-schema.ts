/** HR Phase 6 — HumanSoft parity: 8-step leave, OT workflow, QR/GPS, quotas, tax export */

export const NEXUS_HR_PHASE6_SQL = `
  CREATE TABLE IF NOT EXISTS leave_approval_config (
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    approver_role TEXT NOT NULL,
    label_th TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    PRIMARY KEY (company_id, level)
  );
  CREATE TABLE IF NOT EXISTS employee_leave_quota (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    quota_days REAL DEFAULT 0,
    used_days REAL DEFAULT 0,
    UNIQUE(user_id, leave_type_id, year)
  );
  CREATE TABLE IF NOT EXISTS attendance_locations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lat REAL,
    lng REAL,
    radius_m REAL DEFAULT 150,
    qr_token TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_locations_token ON attendance_locations(qr_token);
  CREATE TABLE IF NOT EXISTS ot_approval_steps (
    id TEXT PRIMARY KEY,
    ot_request_id TEXT NOT NULL,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    approver_role TEXT NOT NULL,
    label_th TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    approved_at TEXT,
    note TEXT
  );
`

export const NEXUS_HR_PHASE6_PG = NEXUS_HR_PHASE6_SQL
  .replace(/datetime\('now'\)/g, 'NOW()')
  .replace(/REAL/g, 'NUMERIC')
  .replace(/INTEGER DEFAULT 1/g, 'INTEGER DEFAULT 1')

export const HR_PHASE6_MIGRATIONS = [
  `ALTER TABLE time_attendance ADD COLUMN qr_location_id TEXT`,
  `ALTER TABLE time_attendance ADD COLUMN clock_in_lat REAL`,
  `ALTER TABLE time_attendance ADD COLUMN clock_in_lng REAL`,
  `ALTER TABLE overtime_requests ADD COLUMN approval_level INTEGER DEFAULT 0`,
  `ALTER TABLE overtime_requests ADD COLUMN required_levels INTEGER DEFAULT 3`,
]

/** HumanSoft-style 8 approval levels (01–08) */
export const DEFAULT_LEAVE_APPROVAL_CONFIG = [
  { level: 1, approver_role: 'hr', label_th: '01 หัวหน้างาน' },
  { level: 2, approver_role: 'hr', label_th: '02 HR' },
  { level: 3, approver_role: 'finance', label_th: '03 การเงิน' },
  { level: 4, approver_role: 'admin', label_th: '04 ผู้บริหาร' },
  { level: 5, approver_role: 'admin', label_th: '05 กรรมการ' },
  { level: 6, approver_role: 'finance', label_th: '06 ตรวจสอบการเงิน' },
  { level: 7, approver_role: 'hr', label_th: '07 HR สุดท้าย' },
  { level: 8, approver_role: 'admin', label_th: '08 อนุมัติขั้นสุดท้าย' },
]

export const DEFAULT_OT_APPROVAL_CHAIN = [
  { level: 1, role: 'hr', label_th: '01 HR' },
  { level: 2, role: 'finance', label_th: '02 การเงิน' },
  { level: 3, role: 'admin', label_th: '03 ผู้บริหาร' },
]

export const APPROVE_FLAG = { pending: '01', approved: '02', rejected: '03' } as const
