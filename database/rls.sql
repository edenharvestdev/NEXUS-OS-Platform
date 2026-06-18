-- ═══════════════════════════════════════════════════════════════
-- NEXASOS ROW LEVEL SECURITY
-- รัน file นี้หลังจาก schema.sql
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS ทุก Table
ALTER TABLE companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs        ENABLE ROW LEVEL SECURITY;

-- Helper function: ดึง company_id ของ user ปัจจุบัน
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── COMPANIES ──────────────────────────────────────────────────
CREATE POLICY "view_own_company" ON companies
  FOR SELECT USING (id = get_my_company_id());

-- ─── USERS ──────────────────────────────────────────────────────
CREATE POLICY "company_isolation_users" ON users
  FOR ALL USING (company_id = get_my_company_id());

-- ─── TRANSACTIONS ───────────────────────────────────────────────
CREATE POLICY "company_isolation_transactions" ON transactions
  FOR ALL USING (company_id = get_my_company_id());

-- ─── DEALS ──────────────────────────────────────────────────────
CREATE POLICY "company_isolation_deals" ON deals
  FOR ALL USING (company_id = get_my_company_id());

-- ─── MEETINGS ───────────────────────────────────────────────────
CREATE POLICY "company_isolation_meetings" ON meetings
  FOR ALL USING (company_id = get_my_company_id());

-- ─── ACTION ITEMS ────────────────────────────────────────────────
CREATE POLICY "company_isolation_action_items" ON action_items
  FOR ALL USING (company_id = get_my_company_id());

-- ─── CHAT MESSAGES ───────────────────────────────────────────────
CREATE POLICY "company_isolation_chat" ON chat_messages
  FOR ALL USING (company_id = get_my_company_id());

-- ─── DOCUMENTS ───────────────────────────────────────────────────
CREATE POLICY "company_isolation_documents" ON documents
  FOR ALL USING (company_id = get_my_company_id());

-- ─── CAMPAIGNS ───────────────────────────────────────────────────
CREATE POLICY "company_isolation_campaigns" ON campaigns
  FOR ALL USING (company_id = get_my_company_id());

-- ─── AI LOGS ─────────────────────────────────────────────────────
CREATE POLICY "company_isolation_ai_logs" ON ai_logs
  FOR ALL USING (company_id = get_my_company_id());
