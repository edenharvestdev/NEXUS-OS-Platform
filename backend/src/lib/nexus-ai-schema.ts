/** AI layer — per-user memory, notifications, files, chat scopes */
export const NEXUS_AI_SQL = `
  CREATE TABLE IF NOT EXISTS user_ai_memory (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_key TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    source TEXT DEFAULT 'chat',
    security_tier TEXT DEFAULT 'T1',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    meta TEXT DEFAULT '{}',
    read_flag INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_files (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department TEXT,
    name TEXT NOT NULL,
    mime_type TEXT DEFAULT 'application/octet-stream',
    size_bytes INTEGER DEFAULT 0,
    content_base64 TEXT,
    security_tier TEXT DEFAULT 'T1',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS task_assignments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assigned_by TEXT NOT NULL REFERENCES users(id),
    assigned_to TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    skill_key TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'open',
    match_score REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`

export const NEXUS_AI_PG = `
  CREATE TABLE IF NOT EXISTS user_ai_memory (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_key TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    source TEXT DEFAULT 'chat',
    security_tier TEXT DEFAULT 'T1',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    meta TEXT DEFAULT '{}',
    read_flag INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS user_files (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department TEXT,
    name TEXT NOT NULL,
    mime_type TEXT DEFAULT 'application/octet-stream',
    size_bytes INTEGER DEFAULT 0,
    content_base64 TEXT,
    security_tier TEXT DEFAULT 'T1',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS task_assignments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assigned_by TEXT NOT NULL REFERENCES users(id),
    assigned_to TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    skill_key TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'open',
    match_score REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`

export const CHAT_SCOPE_MIGRATIONS = [
  `ALTER TABLE chat_messages ADD COLUMN chat_scope TEXT DEFAULT 'company'`,
  `ALTER TABLE chat_messages ADD COLUMN department TEXT`,
]
