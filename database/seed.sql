-- ═══════════════════════════════════════════════════════════════
-- NEXASOS DEMO SEED DATA
-- รัน file นี้หลังจาก schema.sql และ rls.sql
-- ═══════════════════════════════════════════════════════════════

-- Demo Company
INSERT INTO companies (id, name, slug, industry, size)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'บริษัท ABC จำกัด',
  'abc-demo',
  'เทคโนโลยี',
  '100-500'
) ON CONFLICT (id) DO NOTHING;

-- Demo Transactions
INSERT INTO transactions (company_id, description, amount, type, category, status, date) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ซื้อวัสดุสำนักงาน',    4280,   'expense', 'ค่าใช้จ่าย', 'approved', CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000001', 'ค่าโฆษณา Facebook',    15000,  'expense', 'Marketing',  'pending',  CURRENT_DATE - 1),
  ('00000000-0000-0000-0000-000000000001', 'ซื้ออุปกรณ์ IT',        32500,  'expense', 'IT',         'approved', CURRENT_DATE - 2),
  ('00000000-0000-0000-0000-000000000001', 'รายได้ Project ABC',    150000, 'income',  'รายได้',     'approved', CURRENT_DATE - 3),
  ('00000000-0000-0000-0000-000000000001', 'ค่าเช่าสำนักงาน',      85000,  'expense', 'ค่าใช้จ่าย', 'approved', CURRENT_DATE - 4),
  ('00000000-0000-0000-0000-000000000001', 'รายได้ Project XYZ',   280000, 'income',  'รายได้',     'approved', CURRENT_DATE - 5);

-- Demo Deals
INSERT INTO deals (company_id, name, value, stage, probability, contact, notes) VALUES
  ('00000000-0000-0000-0000-000000000001', 'บริษัท XYZ จำกัด',  850000,  'สนใจ',    82, 'คุณวิชัย',  'มีแนวโน้มสูง ต้องการ demo Q2'),
  ('00000000-0000-0000-0000-000000000001', 'ABC Corporation',   1200000, 'นำเสนอ',  65, 'Ms. Sarah', 'รอผลการพิจารณา board'),
  ('00000000-0000-0000-0000-000000000001', 'ไทยพัฒนา กรุ๊ป',   340000,  'เจรจา',   71, 'คุณสมหมาย', 'ต่อรองราคา 5%'),
  ('00000000-0000-0000-0000-000000000001', 'Global Tech Co.',   2100000, 'ปิดดีล',  95, 'Mr. John',  'เตรียมสัญญา'),
  ('00000000-0000-0000-0000-000000000001', 'สยามสตาร์ จำกัด',  450000,  'ติดต่อ',  20, 'คุณนภา',    'ส่ง brochure แล้ว');

-- Demo Campaigns
INSERT INTO campaigns (company_id, name, channel, budget, spent, reach, clicks, conversions, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Summer Sale 2026',    'Facebook Ads',  50000, 38000, 45200, 2340, 187, 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Brand Awareness Q2',  'Google Display', 30000, 13500, 78900, 890,  45,  'active'),
  ('00000000-0000-0000-0000-000000000001', 'Retargeting Cart',    'Facebook+IG',    20000, 20000, 12400, 1120, 234, 'paused'),
  ('00000000-0000-0000-0000-000000000001', 'LINE OA Push',        'LINE',           15000, 8200,  18900, 3400, 420, 'active');

-- Demo AI Logs
INSERT INTO ai_logs (company_id, agent, action, tokens_used, cost_thb) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Meeting Brain',  'สรุปประชุม Marketing Q2', 500, 0.15),
  ('00000000-0000-0000-0000-000000000001', 'Finance OCR',    'ประมวลผลใบเสร็จ Receipt-001', 200, 0.06),
  ('00000000-0000-0000-0000-000000000001', 'Company GPT',    'ตอบคำถาม HR — นโยบายลาป่วย', 150, 0.045),
  ('00000000-0000-0000-0000-000000000001', 'Doc Guardian',   'วิเคราะห์สัญญา ABC Corp', 400, 0.12),
  ('00000000-0000-0000-0000-000000000001', 'Sales Copilot',  'Win Rate analysis — XYZ Corp', 180, 0.054);
