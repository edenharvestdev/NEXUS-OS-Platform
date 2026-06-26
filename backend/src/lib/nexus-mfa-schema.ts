/**
 * MFA-1 step-up tables. Cross-DB DDL (Postgres + SQLite via execMulti).
 * - user_mfa: one TOTP enrollment per user; the secret is stored ENCRYPTED
 *   (encryptField), never in plaintext. `enabled` flips to 1 only after the
 *   user proves possession by confirming a code.
 * - step_up_used_jti: single-use ledger for step-up tokens (replay protection) —
 *   a consumed jti can never be replayed.
 */
export const MFA_STEPUP_DDL = `
CREATE TABLE IF NOT EXISTS user_mfa (
  user_id TEXT PRIMARY KEY,
  secret_enc TEXT NOT NULL,
  method TEXT DEFAULT 'totp',
  enabled INTEGER DEFAULT 0,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS step_up_used_jti (
  jti TEXT PRIMARY KEY,
  user_id TEXT,
  used_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_step_up_jti_user ON step_up_used_jti(user_id);
`
