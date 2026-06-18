/** NEXUS OS full schema — onboarding, L2/L3, patients T3, KPI self-entry */
export const NEXUS_FULL_SQL = `
  CREATE TABLE IF NOT EXISTS onboarding_state (
    company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    industry TEXT DEFAULT 'generic',
    step INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    meta TEXT DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    layer TEXT NOT NULL DEFAULT 'Knowledge',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'SOP',
    security_tier TEXT DEFAULT 'T1',
    status TEXT DEFAULT 'published',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kpi_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    metric_key TEXT NOT NULL,
    metric_name TEXT,
    value REAL NOT NULL,
    period TEXT DEFAULT (date('now')),
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS daily_ai_tasks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    reason TEXT,
    skill_key TEXT,
    assigned_by TEXT DEFAULT 'ai',
    due_date TEXT,
    done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_capacity (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    hours_per_day REAL DEFAULT 8,
    workload_score REAL DEFAULT 50,
    skills_declared TEXT DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    name_encrypted TEXT NOT NULL,
    phone_encrypted TEXT,
    consent_given INTEGER DEFAULT 0,
    consent_at TEXT,
    medical_notes_encrypted TEXT,
    visit_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`

export const NEXUS_FULL_PG = `
  CREATE TABLE IF NOT EXISTS onboarding_state (
    company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    industry TEXT DEFAULT 'generic',
    step INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    meta TEXT DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    layer TEXT NOT NULL DEFAULT 'Knowledge',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'SOP',
    security_tier TEXT DEFAULT 'T1',
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS kpi_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    metric_key TEXT NOT NULL,
    metric_name TEXT,
    value REAL NOT NULL,
    period TEXT DEFAULT CURRENT_DATE::TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS daily_ai_tasks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    reason TEXT,
    skill_key TEXT,
    assigned_by TEXT DEFAULT 'ai',
    due_date TEXT,
    done INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS user_capacity (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    hours_per_day NUMERIC DEFAULT 8,
    workload_score NUMERIC DEFAULT 50,
    skills_declared TEXT DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    name_encrypted TEXT NOT NULL,
    phone_encrypted TEXT,
    consent_given INTEGER DEFAULT 0,
    consent_at TIMESTAMPTZ,
    medical_notes_encrypted TEXT,
    visit_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`
