import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { NEXUS_SCHEMA_PG, DICTIONARY_MIGRATIONS } from './nexus-schema'
import { NEXUS_EXTENDED_PG, WORKLOG_SLA_PG } from './nexus-extended-schema'
import { NEXUS_FULL_PG } from './nexus-full-schema'
import { NEXUS_AI_PG, CHAT_SCOPE_MIGRATIONS } from './nexus-ai-schema'
import { NEXUS_OPS_PG } from './nexus-ops-schema'
import { NEXUS_ENTITY_PG, ENTITY_SCOPING_MIGRATIONS } from './nexus-entity-schema'
import { NEXUS_HR_PG } from './nexus-hr-schema'
import { NEXUS_HR_PHASE5_PG, HR_PHASE5_MIGRATIONS } from './nexus-hr-phase5-schema'
import { NEXUS_HR_PHASE6_PG, HR_PHASE6_MIGRATIONS } from './nexus-hr-phase6-schema'
import dotenv from 'dotenv'
dotenv.config()

// ── Connection ───────────────────────────────────────────────────
let pool: Pool | null = null

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  })
  console.log('🐘 Using PostgreSQL (Railway)')
} else {
  console.log('🗄️  DATABASE_URL not set — using SQLite for local dev')
}

// ── Param converter: $1,$2 → ? for SQLite ───────────────────────
// Postgres lets a single param be referenced by multiple placeholders
// (e.g. `$1` used twice, or out-of-order `$2 ... $1`). SQLite `?` is
// positional, so we rebuild the params array to match each placeholder
// occurrence — repeating/reordering values as needed. A naive `$N → ?`
// swap without this remap throws "Too few parameter values" whenever a
// placeholder is reused, which crashes the request.
function toSQLite(sql: string, params: any[]): { sql: string; params: any[] } {
  const remapped: any[] = []
  const converted = sql.replace(/\$(\d+)/g, (_match, n: string) => {
    remapped.push(params[Number(n) - 1])
    return '?'
  })
  return { sql: converted, params: remapped }
}

// ── Universal Query Interface ────────────────────────────────────
export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  if (pool) {
    const { rows } = await pool.query(sql, params)
    return rows
  }
  // SQLite fallback — convert $1,$2 → ?
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { db } = require('./db-sqlite') as { db: any }
  const q = toSQLite(sql, params)
  return db.prepare(q.sql).all(...q.params) as any[]
}

export async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await queryAll(sql, params)
  return rows[0] ?? null
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  if (pool) {
    await pool.query(sql, params)
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { db } = require('./db-sqlite') as { db: any }
  const q = toSQLite(sql, params)
  db.prepare(q.sql).run(...q.params)
}

/**
 * Run raw DDL that may contain MULTIPLE statements (no params). Postgres runs
 * the whole string in one simple query; SQLite uses better-sqlite3's exec()
 * which handles multiple statements (run()/prepare() handle only one). Used by
 * the migration runner so a migration can ship several DDL statements at once.
 */
export async function execMulti(sql: string): Promise<void> {
  if (pool) {
    await pool.query(sql)
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { db } = require('./db-sqlite') as { db: any }
  db.exec(sql)
}

export function newId(): string {
  return randomUUID()
}

// ── Schema Init (PostgreSQL only) ────────────────────────────────
export async function initSchema(): Promise<void> {
  if (!pool) {
    if (process.env.VERCEL) {
      console.warn('⚠️ DATABASE_URL is not set on Vercel. Database operations will fail.')
    }
    return
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
      industry TEXT, size TEXT, tax_id TEXT, address TEXT, settings TEXT DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff', department TEXT, avatar TEXT,
      color TEXT DEFAULT '#C4956A', phone TEXT, salary TEXT,
      leave_total INTEGER DEFAULT 15, leave_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), description TEXT NOT NULL, amount NUMERIC NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')), category TEXT DEFAULT 'ค่าใช้จ่าย',
      status TEXT DEFAULT 'pending', date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), name TEXT NOT NULL, value NUMERIC DEFAULT 0,
      stage TEXT DEFAULT 'ติดต่อ', probability INTEGER DEFAULT 50,
      contact TEXT, email TEXT, phone TEXT, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), title TEXT NOT NULL, summary TEXT, decisions TEXT,
      sentiment TEXT DEFAULT 'neutral', duration_minutes INTEGER DEFAULT 60,
      participants INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY, meeting_id TEXT REFERENCES meetings(id) ON DELETE CASCADE,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE, task TEXT NOT NULL,
      assigned_to TEXT, due_date TEXT, priority TEXT DEFAULT 'med',
      done INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), session_id TEXT NOT NULL DEFAULT 'default',
      role TEXT NOT NULL CHECK (role IN ('user','ai')), content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), name TEXT NOT NULL, size TEXT,
      status TEXT DEFAULT 'pending', risk_score INTEGER, risk_level TEXT,
      risks TEXT DEFAULT '[]', summary TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), name TEXT NOT NULL, channel TEXT,
      budget NUMERIC DEFAULT 0, spent NUMERIC DEFAULT 0, reach INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ai_logs (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), agent TEXT NOT NULL, action TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0, cost_thb NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'success', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), title TEXT NOT NULL,
      priority TEXT DEFAULT 'med', due_date TEXT, done INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), type TEXT NOT NULL, days INTEGER DEFAULT 1,
      reason TEXT, start_date TEXT, status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pool.query(NEXUS_SCHEMA_PG)
  await pool.query(NEXUS_EXTENDED_PG)
  await pool.query(NEXUS_FULL_PG)
  await pool.query(NEXUS_AI_PG)
  await pool.query(NEXUS_OPS_PG)
  await pool.query(NEXUS_ENTITY_PG)
  await pool.query(NEXUS_HR_PG)
  await pool.query(NEXUS_HR_PHASE5_PG)
  await pool.query(NEXUS_HR_PHASE6_PG)
  await pool.query(WORKLOG_SLA_PG)

  await pool.query(`
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings TEXT DEFAULT '{}';
  `)
  for (const sql of DICTIONARY_MIGRATIONS) {
    try { await pool.query(sql.replace('ADD COLUMN', 'ADD COLUMN IF NOT EXISTS')) } catch { /* exists */ }
  }
  for (const sql of CHAT_SCOPE_MIGRATIONS) {
    try { await pool.query(sql.replace('ADD COLUMN', 'ADD COLUMN IF NOT EXISTS')) } catch { /* exists */ }
  }
  for (const sql of ENTITY_SCOPING_MIGRATIONS) {
    try { await pool.query(sql.replace('ADD COLUMN', 'ADD COLUMN IF NOT EXISTS')) } catch { /* exists */ }
  }
  for (const sql of HR_PHASE5_MIGRATIONS) {
    try { await pool.query(sql.replace('ADD COLUMN', 'ADD COLUMN IF NOT EXISTS')) } catch { /* exists */ }
  }
  for (const sql of HR_PHASE6_MIGRATIONS) {
    try { await pool.query(sql.replace('ADD COLUMN', 'ADD COLUMN IF NOT EXISTS')) } catch { /* exists */ }
  }

  console.log('✅ PostgreSQL schema ready — ไม่มี demo user · สมัครองค์กรใหม่ที่ /login')
}
