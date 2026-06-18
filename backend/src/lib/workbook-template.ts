/**
 * NEXUS OS Implementation Workbook — canonical template
 * Source: docs/NEXUS-OS-Implementation-Workbook.xlsx
 * Principle: Data First → AI Later
 */

export type DictionarySeed = {
  layer: string
  metric_key: string
  name: string
  definition: string
  formula: string
  source: string
  owner: string
  security_tier: string
  update_frequency?: string
  examples?: string
}

/** Tab 1 · Data Taxonomy — 10 clinic metrics */
export const CLINIC_DICTIONARY_SEED: DictionarySeed[] = [
  {
    layer: 'Financial', metric_key: 'doctor_revenue', name: 'Doctor Revenue',
    definition: 'รายได้สุทธิที่เกิดจากหมอแต่ละคน',
    formula: 'ยอดหัตถการในชื่อหมอ − ต้นทุนวัสดุ',
    source: 'ระบบนัด/HIS, บัญชี', owner: 'Finance', security_tier: 'T2',
    update_frequency: 'daily', examples: 'หมอ A = 85,000/วัน',
  },
  {
    layer: 'Customer', metric_key: 'customer_retention', name: 'Customer Retention',
    definition: 'สัดส่วนลูกค้าเก่าที่กลับมาใช้ซ้ำใน 90 วัน',
    formula: 'ลูกค้าซ้ำ ÷ ลูกค้าทั้งหมด ×100',
    source: 'CRM/LINE', owner: 'Marketing', security_tier: 'T2',
    update_frequency: 'monthly', examples: '68%',
  },
  {
    layer: 'Performance', metric_key: 'complaint_rate', name: 'Complaint Rate',
    definition: 'อัตราเคสที่มีคอมเพลน',
    formula: 'จำนวนคอมเพลน ÷ เคสทั้งหมด ×100',
    source: 'รีวิว/Ticket', owner: 'หัวหน้าสาขา', security_tier: 'T1',
    update_frequency: 'weekly', examples: '2.1%',
  },
  {
    layer: 'Operation', metric_key: 'no_show_rate', name: 'No-show Rate',
    definition: 'อัตราลูกค้านัดแล้วไม่มา',
    formula: 'นัดที่ไม่มา ÷ นัดทั้งหมด ×100',
    source: 'ระบบนัด', owner: 'Operation', security_tier: 'T1',
    update_frequency: 'daily', examples: '6%',
  },
  {
    layer: 'Operation', metric_key: 'daily_readiness', name: 'Daily Readiness',
    definition: 'ความพร้อมก่อนเปิดบริการ',
    formula: 'เฉลี่ยเช็กลิสต์ความพร้อม (คน/ห้อง/เครื่องมือ)',
    source: 'Workspace', owner: 'หัวหน้าสาขา', security_tier: 'T1',
    update_frequency: 'daily', examples: '92%',
  },
  {
    layer: 'Performance', metric_key: 'staff_kpi', name: 'Staff KPI',
    definition: 'คะแนนผลงานรายคน',
    formula: 'งานเสร็จตรงเวลา×คุณภาพ (ตามสูตร KPI)',
    source: 'Workspace/Log', owner: 'HR', security_tier: 'T2',
    update_frequency: 'monthly', examples: 'แพรว = 96',
  },
  {
    layer: 'People', metric_key: 'skill_score', name: 'Skill Score',
    definition: 'ระดับทักษะรายคน คำนวณจากงานจริง',
    formula: 'น้ำหนักทักษะ×ผลงาน+หลักฐาน',
    source: 'Skill Wallet', owner: 'HR', security_tier: 'T2',
    update_frequency: 'continuous', examples: 'หัตถการ 88',
  },
  {
    layer: 'People', metric_key: 'new_doctor_ramp', name: 'New Doctor Ramp',
    definition: 'พัฒนาการหมอใหม่ วันที่ 1–30',
    formula: 'อัตราเพิ่มลูกค้าเก่า + คอร์สที่เชี่ยวชาญ',
    source: 'HIS+CRM', owner: 'ผู้บริหาร', security_tier: 'T2',
    update_frequency: 'monthly', examples: 'วันที่30: 24 เคสซ้ำ',
  },
  {
    layer: 'Financial', metric_key: 'cost_saving', name: 'Cost Saving',
    definition: 'ต้นทุนที่ประหยัดได้จากระบบ',
    formula: 'ต้นทุนเดิม − ต้นทุนปัจจุบัน',
    source: 'บัญชี', owner: 'Finance', security_tier: 'T2',
    update_frequency: 'monthly', examples: '12,450 บาท',
  },
  {
    layer: 'Customer', metric_key: 'patient_record', name: 'Patient Record',
    definition: 'ข้อมูลคนไข้/ประวัติการรักษา',
    formula: '— (ข้อมูลดิบ ไม่ใช่ตัวเลขสรุป)',
    source: 'HIS', owner: 'แพทย์/ผู้ดูแล', security_tier: 'T3',
    update_frequency: 'continuous', examples: 'เข้ารหัส + PDPA',
  },
]

/** Tab 2 · Log Collection Checklist — Security */
export const SECURITY_CHECKLIST = [
  { id: 'promo_hours', category: 'ข้อมูลโปรโมชั่น/เปิด-ปิด', example: 'ชั่วโมงเปิด, โปรฯ', tier: 'T0', pii: false, encrypt: false, access: 'ทุกคน + สาธารณะ', retention: '-', audit: false, pdpa: false },
  { id: 'sop_manual', category: 'SOP / คู่มือทำงาน', example: 'ขั้นตอนหัตถการ', tier: 'T1', pii: false, encrypt: false, access: 'พนักงานในองค์กร', retention: 'ตลอดอายุงาน', audit: true, pdpa: false },
  { id: 'kpi_schedule', category: 'KPI / ตารางงานทีม', example: 'KPI รายทีม', tier: 'T1', pii: false, encrypt: true, access: 'หัวหน้า + เจ้าตัว', retention: '2 ปี', audit: true, pdpa: false },
  { id: 'revenue_cost', category: 'ยอดขาย / ต้นทุนรายคน', example: 'Doctor Revenue', tier: 'T2', pii: false, encrypt: true, access: 'หัวหน้า + Finance', retention: '5 ปี', audit: true, pdpa: false },
  { id: 'strategy', category: 'กลยุทธ์ / แผนธุรกิจ', example: 'แผนการตลาด', tier: 'T2', pii: false, encrypt: true, access: 'ผู้บริหาร', retention: 'ตามนโยบาย', audit: true, pdpa: false },
  { id: 'hr_data', category: 'ข้อมูลพนักงาน (HR)', example: 'เงินเดือน, สัญญา', tier: 'T3', pii: true, encrypt: true, access: 'HR + ผู้บริหาร', retention: 'ตามกฎหมาย', audit: true, pdpa: true },
  { id: 'patient_health', category: 'ข้อมูลคนไข้ / สุขภาพ', example: 'ประวัติรักษา, ผลตรวจ', tier: 'T3', pii: true, encrypt: true, access: 'แพทย์ + ผู้ดูแลที่ได้รับสิทธิ์', retention: 'ตามกฎหมายแพทย์', audit: true, pdpa: true },
  { id: 'financial_pii', category: 'เลขบัตร ปชช./การเงินลูกค้า', example: 'เลขบัตร, บัตรเครดิต', tier: 'T3', pii: true, encrypt: true, access: 'เฉพาะผู้ได้รับสิทธิ์', retention: 'ตามกฎหมาย', audit: true, pdpa: true },
]

/** Tab 6 · Security Reference T0–T3 */
export const SECURITY_TIERS = [
  { tier: 'T0', name: 'Public / สาธารณะ', definition: 'ข้อมูลเปิดเผยได้ ไม่เสียหายถ้ารั่ว', examples: 'โปรโมชั่น, ชั่วโมงเปิด', controls: 'ไม่ต้องควบคุมพิเศษ', access: 'ทุกคน + ภายนอก' },
  { tier: 'T1', name: 'Internal / ภายใน', definition: 'ใช้ภายในองค์กร', examples: 'SOP, KPI ทีม, ตารางงาน', controls: 'Login เข้าถึง + Log การเข้าถึง', access: 'พนักงานในองค์กร' },
  { tier: 'T2', name: 'Confidential / ความลับธุรกิจ', definition: 'รั่วแล้วกระทบธุรกิจ', examples: 'ยอด/ต้นทุนรายคน, กลยุทธ์', controls: 'เข้ารหัส + จำกัด Role + Audit', access: 'หัวหน้า + ผู้บริหารที่เกี่ยว' },
  { tier: 'T3', name: 'Restricted / อ่อนไหว (PDPA)', definition: 'ข้อมูลส่วนบุคคล/สุขภาพ', examples: 'คนไข้, เงินเดือน, เลขบัตร', controls: 'เข้ารหัสบังคับ + Masking + Audit เต็ม + ขอความยินยอม', access: 'เฉพาะผู้ได้รับสิทธิ์' },
]

/** Tab 5 · Work Log field specification */
export const WORK_LOG_FIELDS = [
  { field: 'log_id', type: 'string', required: true, description: 'รหัส Log ไม่ซ้ำ', example: 'LOG-2026-000128', tier: 'T1' },
  { field: 'timestamp', type: 'datetime', required: true, description: 'วันเวลาที่เกิดเหตุการณ์', example: '2026-06-15 08:35', tier: 'T1' },
  { field: 'org_id', type: 'string', required: true, description: 'รหัสองค์กร (รองรับหลายองค์กร)', example: 'ORG-CLINIC-01', tier: 'T1' },
  { field: 'user_id', type: 'string', required: true, description: 'รหัสพนักงานที่ทำงาน', example: 'U-แพรว-012', tier: 'T2' },
  { field: 'role', type: 'string', required: true, description: 'บทบาท/ตำแหน่ง', example: 'พยาบาลหัตถการ', tier: 'T1' },
  { field: 'dept', type: 'string', required: true, description: 'แผนก', example: 'หัตถการ', tier: 'T1' },
  { field: 'action_type', type: 'enum', required: true, description: 'ประเภท: รับงาน/เริ่ม/ส่ง/อนุมัติ/ปัญหา', example: 'ส่งงาน', tier: 'T1' },
  { field: 'object', type: 'string', required: false, description: 'สิ่งที่ทำ/อ้างถึง', example: 'เตรียมห้องหัตถการ 2', tier: 'T1' },
  { field: 'task_id', type: 'string', required: false, description: 'รหัสงานที่ผูก', example: 'TASK-3391', tier: 'T1' },
  { field: 'status', type: 'enum', required: true, description: 'ผ่าน/ตีกลับ/ขอแก้ไข/รอตรวจ', example: 'รอตรวจ', tier: 'T1' },
  { field: 'evidence_url', type: 'string', required: false, description: 'ลิงก์หลักฐาน (รูป/QR/เอกสาร)', example: '/evidence/3391.jpg', tier: 'T2' },
  { field: 'kpi_impact', type: 'number', required: false, description: 'ผลต่อ KPI (+/-)', example: '+1', tier: 'T2' },
  { field: 'reviewed_by', type: 'string', required: false, description: 'หัวหน้าที่อนุมัติ', example: 'U-สมชาย-003', tier: 'T2' },
  { field: 'security_tier', type: 'enum', required: true, description: 'ชั้นความลับของ Log นี้', example: 'T2', tier: 'T1' },
]

/** Tab 3 · Org Onboarding — 6 phases, 15 tasks */
export const ONBOARDING_PHASES = [
  { id: 1, key: 'blueprint', label: 'Phase 1 · Organizational Blueprint' },
  { id: 2, key: 'dictionary', label: 'Phase 2 · Data Dictionary' },
  { id: 3, key: 'knowledge', label: 'Phase 3 · Knowledge & SOP' },
  { id: 4, key: 'people', label: 'Phase 4 · People & Skill' },
  { id: 5, key: 'import', label: 'Phase 5 · นำส่งเข้าระบบ' },
  { id: 6, key: 'ai', label: 'Phase 6 · เปิด AI Layer' },
]

export const ONBOARDING_TASKS: Array<{
  id: string
  phase: number
  title: string
  owner: string
  reference: string
  autoKey?: string
}> = [
  { id: 'p1_depts', phase: 1, title: 'ลิสต์แผนกทั้งหมด + จำนวนคน', owner: 'เจ้าของ/HR', reference: 'แท็บ 1', autoKey: 'departments' },
  { id: 'p1_workflow', phase: 1, title: 'ระบุ Workflow หลักของแต่ละแผนก', owner: 'หัวหน้าแผนก', reference: 'Process Manual', autoKey: 'workflow' },
  { id: 'p1_sources', phase: 1, title: 'รวบรวมแหล่งข้อมูลที่มีอยู่ (Excel/LINE/ERP)', owner: 'IT/Admin', reference: 'แท็บ 2', autoKey: 'sources' },
  { id: 'p2_define', phase: 2, title: 'นิยามตัวเลขสำคัญทุกตัว', owner: 'หัวหน้าแผนก', reference: 'แท็บ 1', autoKey: 'dictionary_full' },
  { id: 'p2_formula', phase: 2, title: 'ระบุสูตรคำนวณ + เจ้าของข้อมูล', owner: 'Finance/Data', reference: 'แท็บ 1', autoKey: 'dictionary_formula' },
  { id: 'p2_security', phase: 2, title: 'จัดชั้น Security ของแต่ละหมวด', owner: 'IT/ผู้บริหาร', reference: 'แท็บ 2 + 6', autoKey: 'dictionary_tier' },
  { id: 'p3_sop', phase: 3, title: 'อัปโหลด SOP / คู่มือ / Policy', owner: 'หัวหน้าแผนก', reference: 'แท็บ 6', autoKey: 'knowledge' },
  { id: 'p3_categorize', phase: 3, title: 'จัดหมวด: Training/Policy/Meeting/KPI', owner: 'Admin', reference: '-', autoKey: 'knowledge_categories' },
  { id: 'p4_jd', phase: 4, title: 'ใส่ Job Description รายตำแหน่ง', owner: 'HR', reference: '-', autoKey: 'job_descriptions' },
  { id: 'p4_skills', phase: 4, title: 'ประเมิน Skill เริ่มต้นรายคน', owner: 'หัวหน้า', reference: 'Skill Framework', autoKey: 'skills' },
  { id: 'p5_system', phase: 5, title: 'กรอกข้อมูลตามเทมเพลตเข้าระบบ', owner: 'Admin', reference: 'แท็บ 5', autoKey: 'work_logs' },
  { id: 'p5_rbac', phase: 5, title: 'ตั้งสิทธิ์เข้าถึงตามชั้น Security', owner: 'IT', reference: 'แท็บ 2', autoKey: 'rbac' },
  { id: 'p5_pilot', phase: 5, title: 'ทดสอบ Login พนักงานนำร่อง', owner: 'IT/HR', reference: '-', autoKey: 'pilot_users' },
  { id: 'p6_ai', phase: 6, title: 'เชื่อม AI Connector (GPT/Claude/Typhoon)', owner: 'Dev', reference: 'แท็บ 4', autoKey: 'ai_connector' },
  { id: 'p6_decision', phase: 6, title: 'ตั้ง Decision Rights ของ AI', owner: 'ผู้บริหาร', reference: 'แท็บ 6', autoKey: 'ai_decision' },
]

export const WORKBOOK_GUIDE = {
  title: 'NEXUS OS — Implementation Workbook',
  subtitle: 'เก็บฐานข้อมูลทีละขั้น → จัดหมวด → เข้าระบบ',
  principles: [
    'ทำแท็บ 1 (นิยามข้อมูล) ให้เสร็จก่อนเสมอ — ถ้านิยามไม่ชัด AI จะวิเคราะห์ผิด',
    'จัดชั้น Security (แท็บ 2 + 6) ก่อนเปิดให้พนักงานเข้าถึง — โดยเฉพาะข้อมูลคนไข้ (T3/PDPA)',
    'แท็บ 3 ส่งให้องค์กรกรอกทีละ Phase — ไม่ต้องทำทีเดียวจบ',
    'แท็บ 5 คือมาตรฐาน Log เดียวกันทุกองค์กร = ระบบ copy วางได้',
  ],
  file: 'docs/NEXUS-OS-Implementation-Workbook.xlsx',
}
