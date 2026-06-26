import { queryAll, queryOne, run, execMulti } from './db'
import { AUDIT_LOGS_DDL, AUDIT_LOGS_APPENDONLY_DDL, AI_QUERY_LOGS_DDL } from './nexus-audit-schema'
import { MFA_STEPUP_DDL } from './nexus-mfa-schema'
import { BREAK_GLASS_DDL } from './nexus-breakglass-schema'

export type Migration = {
  version: number
  name: string
  up: string
  /** Skip the DDL on SQLite (local dev) but still record as applied — for
   *  Postgres-only features (triggers, RLS, REVOKE, partial indexes). */
  pgOnly?: boolean
  /** If the migration fails, abort the boot (process.exit) instead of the
   *  default warn-and-continue — for security-critical migrations that must
   *  not be silently half-applied. */
  critical?: boolean
}

/** Versioned migrations — applied once, tracked in schema_migrations */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'ops_core_tables',
    up: '', // applied via NEXUS_OPS_SQL at boot
  },
  {
    version: 2,
    name: 'user_files_storage_path',
    up: `ALTER TABLE user_files ADD COLUMN storage_path TEXT`,
  },
  {
    version: 3,
    name: 'users_notify_prefs',
    up: `ALTER TABLE users ADD COLUMN email_notify INTEGER DEFAULT 1`,
  },
  {
    version: 4,
    name: 'users_line_user_id',
    up: `ALTER TABLE users ADD COLUMN line_user_id TEXT`,
  },
  {
    version: 5,
    name: 'dictionary_domain',
    up: `ALTER TABLE data_dictionary ADD COLUMN domain TEXT`,
  },
  {
    version: 6,
    name: 'dictionary_priority',
    up: `ALTER TABLE data_dictionary ADD COLUMN priority TEXT DEFAULT 'basic'`,
  },
  {
    version: 7,
    name: 'dictionary_entity',
    up: `ALTER TABLE data_dictionary ADD COLUMN entity TEXT DEFAULT 'all'`,
  },
  {
    version: 8,
    name: 'branches_table',
    up: `CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      entity TEXT DEFAULT 'tamada',
      branch_type TEXT DEFAULT 'owned',
      franchisee TEXT,
      region TEXT,
      created_at TEXT,
      UNIQUE(company_id, code)
    )`,
  },
  {
    version: 9,
    name: 'kpi_branch_code',
    up: `ALTER TABLE kpi_entries ADD COLUMN branch_code TEXT`,
  },
  {
    version: 10,
    name: 'entity_side_tables',
    up: '', // applied via NEXUS_ENTITY_PG at boot
  },
  {
    version: 11,
    name: 'audit_logs_table',
    up: AUDIT_LOGS_DDL, // P1 append-only audit table + indexes (PG + SQLite)
  },
  {
    version: 12,
    name: 'audit_logs_append_only',
    up: AUDIT_LOGS_APPENDONLY_DDL, // Postgres trigger enforcement (skipped on SQLite)
    pgOnly: true,
    critical: true,
  },
  {
    version: 13,
    name: 'ai_query_logs_table',
    up: AI_QUERY_LOGS_DDL, // AIEG-1 AI egress log (PG + SQLite)
  },
  {
    version: 14,
    name: 'mfa_stepup_tables',
    up: MFA_STEPUP_DDL, // MFA-1 user_mfa + step_up_used_jti (PG + SQLite)
  },
  {
    version: 15,
    name: 'break_glass_grants',
    up: BREAK_GLASS_DDL, // BG-1 break-glass grants (PG + SQLite)
  },
]

export async function runMigrations(): Promise<{ applied: number; current: number }> {
  let applied = 0
  for (const m of MIGRATIONS) {
    if (m.version === 1) {
      const exists = await queryOne('SELECT version FROM schema_migrations WHERE version = $1', [1])
      if (!exists) {
        await run('INSERT INTO schema_migrations (version, name) VALUES ($1,$2)', [1, m.name])
        applied++
      }
      continue
    }
    const exists = await queryOne('SELECT version FROM schema_migrations WHERE version = $1', [m.version])
    if (exists) continue
    const isPg = !!process.env.DATABASE_URL
    try {
      if (m.pgOnly && !isPg) {
        // Postgres-only migration — skip the DDL on SQLite but record it as
        // applied so the version isn't retried on every local boot.
      } else if (m.up) {
        await execMulti(m.up) // multi-statement safe on both PG and SQLite
      }
      await run('INSERT INTO schema_migrations (version, name) VALUES ($1,$2)', [m.version, m.name])
      applied++
      console.log(`✅ Migration v${m.version}: ${m.name}${m.pgOnly && !isPg ? ' (skipped on SQLite)' : ''}`)
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        await run('INSERT INTO schema_migrations (version, name) VALUES ($1,$2)', [m.version, m.name])
        applied++
      } else if (m.critical) {
        // Security-critical migration must not be silently half-applied —
        // abort the boot (initialize() will process.exit(1)).
        console.error(`❌ CRITICAL migration v${m.version} (${m.name}) failed — aborting boot:`, msg)
        throw e
      } else {
        console.warn(`⚠️ Migration v${m.version} skipped:`, msg)
      }
    }
  }
  const latest = await queryOne('SELECT MAX(version) as v FROM schema_migrations', [])
  return { applied, current: Number(latest?.v || 0) }
}

export async function getMigrationStatus() {
  const rows = await queryAll('SELECT version, name, applied_at FROM schema_migrations ORDER BY version', [])
  return rows
}
