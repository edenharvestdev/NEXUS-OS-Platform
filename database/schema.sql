-- ═══════════════════════════════════════════════════════════════
-- NEXASOS DATABASE SCHEMA
-- รัน file นี้ใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── COMPANIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  industry    TEXT,
  size        TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID REFERENCES auth.users PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT DEFAULT 'staff',
  department  TEXT,
  avatar      TEXT,
  color       TEXT DEFAULT '#C4956A',
  phone       TEXT,
  salary      TEXT,
  leave_total INT DEFAULT 15,
  leave_used  INT DEFAULT 0,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRANSACTIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income','expense')),
  category    TEXT DEFAULT 'ค่าใช้จ่าย',
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  date        DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEALS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  name         TEXT NOT NULL,
  value        NUMERIC DEFAULT 0,
  stage        TEXT DEFAULT 'ติดต่อ',
  probability  INT DEFAULT 50,
  contact      TEXT,
  email        TEXT,
  phone        TEXT,
  notes        TEXT,
  days_in_stage INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEETINGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id        UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  title             TEXT NOT NULL,
  summary           TEXT,
  decisions         TEXT[],
  sentiment         TEXT DEFAULT 'neutral',
  duration_minutes  INT DEFAULT 60,
  participants      INT DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ACTION ITEMS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id  UUID REFERENCES meetings(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  assigned_to TEXT,
  due_date    TEXT,
  priority    TEXT DEFAULT 'med',
  done        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CHAT MESSAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user','ai')),
  content     TEXT NOT NULL,
  sources     TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCUMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  name        TEXT NOT NULL,
  size        TEXT,
  pages       INT,
  status      TEXT DEFAULT 'pending',
  risk_score  INT,
  risk_level  TEXT,
  risks       JSONB DEFAULT '[]',
  summary     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CAMPAIGNS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  name         TEXT NOT NULL,
  channel      TEXT,
  budget       NUMERIC DEFAULT 0,
  spent        NUMERIC DEFAULT 0,
  reach        INT DEFAULT 0,
  clicks       INT DEFAULT 0,
  conversions  INT DEFAULT 0,
  status       TEXT DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI LOGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  agent        TEXT NOT NULL,
  action       TEXT NOT NULL,
  tokens_used  INT DEFAULT 0,
  cost_thb     NUMERIC DEFAULT 0,
  status       TEXT DEFAULT 'success',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_company         ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company  ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_company         ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_company      ON meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_session          ON chat_messages(company_id, session_id);
CREATE INDEX IF NOT EXISTS idx_documents_company     ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company     ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_company       ON ai_logs(company_id);
