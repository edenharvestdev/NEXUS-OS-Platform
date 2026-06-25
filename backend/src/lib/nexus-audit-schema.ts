/**
 * P1 append-only audit table. Separate from the legacy best-effort `audit_log`
 * (singular). Cross-DB DDL (runs on Postgres + SQLite via execMulti). The
 * append-only ENFORCEMENT (triggers) is Postgres-only and lives in a separate
 * pgOnly+critical migration so SQLite dev still works as a plain table.
 *
 * No FK to companies ON DELETE CASCADE — the audit trail must survive even if a
 * company row is removed (the legacy audit_log's CASCADE is exactly the bug we
 * are fixing).
 */

export const AUDIT_LOGS_DDL = `
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_log_id TEXT PRIMARY KEY,
  company_id TEXT,
  actor_user_id TEXT,
  actor_employee_id TEXT,
  actor_role TEXT,
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  target_security_level TEXT,
  before_value_json TEXT,
  after_value_json TEXT,
  changed_fields_json TEXT,
  ip_address TEXT,
  device TEXT,
  user_agent TEXT,
  request_id TEXT,
  session_id TEXT,
  api_endpoint TEXT,
  http_method TEXT,
  result_status TEXT,
  failure_reason TEXT,
  prev_hash TEXT,
  row_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at);
`

/**
 * Postgres-only: make audit_logs append-only. A BEFORE UPDATE/DELETE trigger
 * raises unless the session has set `audit.purge='on'` (reserved for a future,
 * audited retention job). INSERT is never blocked.
 *
 * NOTE: a belt-and-braces `REVOKE UPDATE,DELETE ON audit_logs FROM <app_role>`
 * is intentionally omitted until the Railway app role name is confirmed
 * (plan §7 / J7). The trigger already enforces append-only for every role.
 */
export const AUDIT_LOGS_APPENDONLY_DDL = `
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger AS $fn$
BEGIN
  IF current_setting('audit.purge', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only (% blocked)', TG_OP;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();
`
