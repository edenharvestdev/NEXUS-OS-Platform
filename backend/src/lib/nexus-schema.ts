/** NEXUS OS L0/L5 schema extensions — shared by PostgreSQL init and SQLite migration */
export { CLINIC_DICTIONARY_SEED } from './workbook-template'
export type { DictionarySeed } from './workbook-template'

export const DICTIONARY_MIGRATIONS = [
  `ALTER TABLE data_dictionary ADD COLUMN examples TEXT DEFAULT ''`,
]

export const NEXUS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS data_dictionary (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    layer TEXT NOT NULL CHECK (layer IN ('People','Customer','Financial','Operation','Knowledge','Performance')),
    metric_key TEXT NOT NULL,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    formula TEXT,
    source TEXT,
    owner TEXT,
    security_tier TEXT DEFAULT 'T1' CHECK (security_tier IN ('T0','T1','T2','T3')),
    update_frequency TEXT DEFAULT 'daily',
    examples TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, metric_key)
  );
  CREATE TABLE IF NOT EXISTS work_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT,
    department TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('accept','start','submit','approve','reject','issue','escalate')),
    object TEXT,
    task_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revision','review')),
    evidence_url TEXT,
    kpi_impact REAL DEFAULT 0,
    reviewed_by TEXT,
    security_tier TEXT DEFAULT 'T1' CHECK (security_tier IN ('T0','T1','T2','T3')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    security_tier TEXT DEFAULT 'T1',
    meta TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
`

export const NEXUS_SCHEMA_PG = `
  CREATE TABLE IF NOT EXISTS data_dictionary (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    layer TEXT NOT NULL CHECK (layer IN ('People','Customer','Financial','Operation','Knowledge','Performance')),
    metric_key TEXT NOT NULL,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    formula TEXT,
    source TEXT,
    owner TEXT,
    security_tier TEXT DEFAULT 'T1' CHECK (security_tier IN ('T0','T1','T2','T3')),
    update_frequency TEXT DEFAULT 'daily',
    examples TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, metric_key)
  );
  CREATE TABLE IF NOT EXISTS work_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT,
    department TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('accept','start','submit','approve','reject','issue','escalate')),
    object TEXT,
    task_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revision','review')),
    evidence_url TEXT,
    kpi_impact NUMERIC DEFAULT 0,
    reviewed_by TEXT,
    security_tier TEXT DEFAULT 'T1' CHECK (security_tier IN ('T0','T1','T2','T3')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    security_tier TEXT DEFAULT 'T1',
    meta TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`
