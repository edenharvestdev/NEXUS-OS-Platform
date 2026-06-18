// Local SQLite database (used only when DATABASE_URL is not set)
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { NEXUS_SCHEMA_SQL, DICTIONARY_MIGRATIONS } from './nexus-schema'
import { NEXUS_EXTENDED_SQL, WORKLOG_SLA_MIGRATIONS } from './nexus-extended-schema'
import { NEXUS_FULL_SQL } from './nexus-full-schema'
import { NEXUS_AI_SQL, CHAT_SCOPE_MIGRATIONS } from './nexus-ai-schema'
import { NEXUS_OPS_SQL } from './nexus-ops-schema'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BetterSqlite3 = require('better-sqlite3')
export const db = new BetterSqlite3(path.join(DATA_DIR, 'nexasos.db')) as any
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    industry TEXT, size TEXT, tax_id TEXT, address TEXT, settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'staff', department TEXT, avatar TEXT, color TEXT DEFAULT '#C4956A',
    phone TEXT, salary TEXT, leave_total INTEGER DEFAULT 15, leave_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), description TEXT NOT NULL, amount REAL NOT NULL,
    type TEXT NOT NULL, category TEXT DEFAULT 'ค่าใช้จ่าย', status TEXT DEFAULT 'pending',
    date TEXT DEFAULT (date('now')), created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL, value REAL DEFAULT 0,
    stage TEXT DEFAULT 'ติดต่อ', probability INTEGER DEFAULT 50, contact TEXT,
    email TEXT, phone TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), title TEXT NOT NULL, summary TEXT,
    decisions TEXT, sentiment TEXT DEFAULT 'neutral',
    duration_minutes INTEGER DEFAULT 60, participants INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY, meeting_id TEXT REFERENCES meetings(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE, task TEXT NOT NULL,
    assigned_to TEXT, due_date TEXT, priority TEXT DEFAULT 'med',
    done INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), session_id TEXT NOT NULL DEFAULT 'default',
    role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL, size TEXT,
    status TEXT DEFAULT 'pending', risk_score INTEGER, risk_level TEXT,
    risks TEXT DEFAULT '[]', summary TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL, channel TEXT,
    budget REAL DEFAULT 0, spent REAL DEFAULT 0, reach INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0, status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ai_logs (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), agent TEXT NOT NULL, action TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0, cost_thb REAL DEFAULT 0, status TEXT DEFAULT 'success',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), title TEXT NOT NULL,
    priority TEXT DEFAULT 'med', due_date TEXT, done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), type TEXT NOT NULL, days INTEGER DEFAULT 1,
    reason TEXT, start_date TEXT, status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

db.exec(NEXUS_SCHEMA_SQL)
db.exec(NEXUS_EXTENDED_SQL)
db.exec(NEXUS_FULL_SQL)
db.exec(NEXUS_AI_SQL)
db.exec(NEXUS_OPS_SQL)
for (const sql of WORKLOG_SLA_MIGRATIONS) {
  try { db.exec(sql) } catch { /* column exists */ }
}
for (const sql of DICTIONARY_MIGRATIONS) {
  try { db.exec(sql) } catch { /* column exists */ }
}
for (const sql of CHAT_SCOPE_MIGRATIONS) {
  try { db.exec(sql) } catch { /* column exists */ }
}

console.log('✅ SQLite schema ready — ไม่มี demo user · สมัครองค์กรใหม่ที่ /login')
