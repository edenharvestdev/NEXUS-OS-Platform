/** HR Phase 5 — OT, leave workflow, attendance GPS */

export const NEXUS_HR_PHASE5_SQL = `
  CREATE TABLE IF NOT EXISTS overtime_types (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    day_type TEXT DEFAULT 'workday',
    multiplier REAL DEFAULT 1.5,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, code)
  );
  CREATE TABLE IF NOT EXISTS overtime_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    work_date TEXT NOT NULL,
    hours REAL NOT NULL DEFAULT 0,
    ot_type_id TEXT REFERENCES overtime_types(id),
    reason TEXT,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leave_approval_steps (
    id TEXT PRIMARY KEY,
    leave_id TEXT NOT NULL,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    approver_role TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    approved_at TEXT,
    note TEXT
  );
`

export const NEXUS_HR_PHASE5_PG = NEXUS_HR_PHASE5_SQL
  .replace(/datetime\('now'\)/g, 'NOW()')
  .replace(/REAL/g, 'NUMERIC')

export const HR_PHASE5_MIGRATIONS = [
  `ALTER TABLE leave_requests ADD COLUMN approve_flag TEXT DEFAULT '01'`,
  `ALTER TABLE leave_requests ADD COLUMN approval_level INTEGER DEFAULT 0`,
  `ALTER TABLE leave_requests ADD COLUMN required_levels INTEGER DEFAULT 2`,
  `ALTER TABLE time_attendance ADD COLUMN lat REAL`,
  `ALTER TABLE time_attendance ADD COLUMN lng REAL`,
]

export const DEFAULT_OT_TYPES = [
  { code: 'OT1', name: 'OT วันทำงาน (×1.5)', day_type: 'workday', multiplier: 1.5 },
  { code: 'OT2', name: 'OT วันหยุด (×2)', day_type: 'holiday', multiplier: 2 },
  { code: 'OT3', name: 'OT วันหยุดนักขัตฤกษ์ (×3)', day_type: 'special_holiday', multiplier: 3 },
  { code: 'OT4', name: 'OT ก่อนกะ (×1.5)', day_type: 'pre_shift', multiplier: 1.5 },
  { code: 'OT5', name: 'OT หลังกะ (×1.5)', day_type: 'post_shift', multiplier: 1.5 },
  { code: 'OT6', name: 'OT กลางคืน (×2)', day_type: 'night', multiplier: 2 },
  { code: 'OT7', name: 'OT สุดสัปดาห์ (×2)', day_type: 'weekend', multiplier: 2 },
  { code: 'OT8', name: 'OT พิเศษ (×2.5)', day_type: 'special', multiplier: 2.5 },
]

export const LEAVE_APPROVAL_CHAIN = [
  { level: 1, role: 'hr' },
  { level: 2, role: 'admin' },
]
