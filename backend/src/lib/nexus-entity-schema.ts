/**
 * Entity-side tables — Tamada (Aesthetic) · SDX (Dental) · Franchise
 * แยก operational data ตามฝั่งธุรกิจ ภายใต้ company_id เดียว
 */

export const ENTITY_SCOPING_MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN entity TEXT DEFAULT 'all'`,
  `ALTER TABLE users ADD COLUMN branch_code TEXT`,
  `ALTER TABLE transactions ADD COLUMN entity TEXT DEFAULT 'all'`,
  `ALTER TABLE transactions ADD COLUMN branch_code TEXT`,
  `ALTER TABLE deals ADD COLUMN entity TEXT DEFAULT 'all'`,
  `ALTER TABLE deals ADD COLUMN branch_code TEXT`,
  `ALTER TABLE patients ADD COLUMN entity TEXT DEFAULT 'tamada'`,
  `ALTER TABLE patients ADD COLUMN branch_code TEXT`,
  `ALTER TABLE work_logs ADD COLUMN entity TEXT DEFAULT 'all'`,
  `ALTER TABLE work_logs ADD COLUMN branch_code TEXT`,
  `ALTER TABLE campaigns ADD COLUMN entity TEXT DEFAULT 'all'`,
  `ALTER TABLE campaigns ADD COLUMN branch_code TEXT`,
  `ALTER TABLE knowledge_items ADD COLUMN entity TEXT DEFAULT 'all'`,
]

export const NEXUS_ENTITY_SQL = `
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_key TEXT NOT NULL CHECK (entity_key IN ('tamada','sdx','franchise')),
    name TEXT NOT NULL,
    name_th TEXT,
    org_code TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, entity_key)
  );
  CREATE TABLE IF NOT EXISTS tamada_cases (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_code TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    patient_id TEXT REFERENCES patients(id),
    treatment_code TEXT,
    treatment_name TEXT,
    amount REAL DEFAULT 0,
    doctor_id TEXT,
    booking_status TEXT DEFAULT 'completed',
    no_show INTEGER DEFAULT 0,
    case_date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sdx_cases (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_code TEXT NOT NULL DEFAULT 'SDX-HQ',
    user_id TEXT REFERENCES users(id),
    patient_id TEXT REFERENCES patients(id),
    treatment_type TEXT,
    amount REAL DEFAULT 0,
    chair_minutes INTEGER DEFAULT 0,
    doctor_id TEXT,
    case_date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS franchise_audits (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_code TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    checklist_passed INTEGER DEFAULT 0,
    checklist_total INTEGER DEFAULT 0,
    mystery_score REAL,
    notes TEXT,
    audit_date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
`

export const NEXUS_ENTITY_PG = `
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_key TEXT NOT NULL CHECK (entity_key IN ('tamada','sdx','franchise')),
    name TEXT NOT NULL,
    name_th TEXT,
    org_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, entity_key)
  );
  CREATE TABLE IF NOT EXISTS tamada_cases (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_code TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    patient_id TEXT REFERENCES patients(id),
    treatment_code TEXT,
    treatment_name TEXT,
    amount NUMERIC DEFAULT 0,
    doctor_id TEXT,
    booking_status TEXT DEFAULT 'completed',
    no_show INTEGER DEFAULT 0,
    case_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS sdx_cases (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_code TEXT NOT NULL DEFAULT 'SDX-HQ',
    user_id TEXT REFERENCES users(id),
    patient_id TEXT REFERENCES patients(id),
    treatment_type TEXT,
    amount NUMERIC DEFAULT 0,
    chair_minutes INTEGER DEFAULT 0,
    doctor_id TEXT,
    case_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS franchise_audits (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_code TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    checklist_passed INTEGER DEFAULT 0,
    checklist_total INTEGER DEFAULT 0,
    mystery_score NUMERIC,
    notes TEXT,
    audit_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`
