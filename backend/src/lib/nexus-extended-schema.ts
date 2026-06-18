/** NEXUS OS extended schema — L1/L4/L5/P5 */
export const NEXUS_EXTENDED_SQL = `
  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id TEXT,
    head_user_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS skill_scores (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    skill_key TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    score REAL DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, user_id, skill_key)
  );
  CREATE TABLE IF NOT EXISTS skill_evidence (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    source_type TEXT NOT NULL,
    source_id TEXT,
    skill_key TEXT NOT NULL,
    points REAL DEFAULT 5,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    source TEXT NOT NULL,
    filename TEXT,
    rows_imported INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    meta TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS line_events (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    line_user_id TEXT,
    event_type TEXT,
    payload TEXT DEFAULT '{}',
    processed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`

export const NEXUS_EXTENDED_PG = `
  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id TEXT,
    head_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS skill_scores (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    skill_key TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id, skill_key)
  );
  CREATE TABLE IF NOT EXISTS skill_evidence (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    source_type TEXT NOT NULL,
    source_id TEXT,
    skill_key TEXT NOT NULL,
    points NUMERIC DEFAULT 5,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    source TEXT NOT NULL,
    filename TEXT,
    rows_imported INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    meta TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS line_events (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    line_user_id TEXT,
    event_type TEXT,
    payload TEXT DEFAULT '{}',
    processed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`

/** SQLite-safe column migrations for work_logs SLA fields */
export const WORKLOG_SLA_MIGRATIONS = [
  'ALTER TABLE work_logs ADD COLUMN sla_due_at TEXT',
  'ALTER TABLE work_logs ADD COLUMN escalation_level INTEGER DEFAULT 0',
  'ALTER TABLE work_logs ADD COLUMN escalated_at TEXT',
  'ALTER TABLE work_logs ADD COLUMN assigned_to TEXT',
]

export const WORKLOG_SLA_PG = `
  ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
  ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
  ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
  ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS assigned_to TEXT;
`

export const DEFAULT_DEPARTMENTS = ['Management', 'Finance', 'HR', 'Sales', 'Marketing', 'Operation', 'IT']

export const ROLE_SKILLS: Record<string, Array<{ key: string; name: string }>> = {
  admin:      [{ key: 'leadership', name: 'Leadership' }, { key: 'strategy', name: 'Strategy' }],
  finance:    [{ key: 'accounting', name: 'Accounting' }, { key: 'compliance', name: 'Compliance' }],
  hr:         [{ key: 'people_ops', name: 'People Ops' }, { key: 'policy', name: 'HR Policy' }],
  sales:      [{ key: 'sales', name: 'Sales' }, { key: 'negotiation', name: 'Negotiation' }],
  marketing:  [{ key: 'marketing', name: 'Marketing' }, { key: 'content', name: 'Content' }],
  it:         [{ key: 'systems', name: 'Systems' }, { key: 'automation', name: 'Automation' }],
  staff:      [{ key: 'execution', name: 'Execution' }, { key: 'quality', name: 'Quality' }],
}
