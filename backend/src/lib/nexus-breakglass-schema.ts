/**
 * BG-1 break-glass grants. Cross-DB DDL (Postgres + SQLite via execMulti).
 * A grant temporarily unlocks a RESTRICTED data class FOR a user. It is created
 * only after a fresh step-up (MFA-1). Hybrid model:
 *   - duration <= 15 min  → self-service: status 'active' immediately + alert
 *   - duration  > 15 min  → 'pending' until a SECOND privileged user approves
 * Timestamps are ISO-8601 UTC strings so `expires_at > :now` compares correctly
 * on both Postgres and SQLite (no DB-specific date functions).
 */
export const BREAK_GLASS_DDL = `
CREATE TABLE IF NOT EXISTS break_glass_grants (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  user_id TEXT NOT NULL,
  data_class TEXT NOT NULL,
  scope TEXT DEFAULT '*',
  reason TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  status TEXT NOT NULL,
  requires_approval INTEGER DEFAULT 0,
  step_up_jti TEXT,
  approved_by TEXT,
  created_at TEXT NOT NULL,
  activated_at TEXT,
  expires_at TEXT,
  decided_at TEXT,
  decided_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_bg_company ON break_glass_grants(company_id);
CREATE INDEX IF NOT EXISTS idx_bg_user ON break_glass_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_bg_status ON break_glass_grants(status);
CREATE INDEX IF NOT EXISTS idx_bg_expires ON break_glass_grants(expires_at);
`
