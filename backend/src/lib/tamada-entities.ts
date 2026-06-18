/**
 * Tamada / SDX entities, branches, and multi-tenant structure
 * PDF: Multi-Tenant Architecture — Tamada Clinic + SDX Dental + Franchise
 */

export type BranchType = 'owned' | 'franchise'

export interface TamadaBranch {
  code: string
  name: string
  entity: 'tamada' | 'sdx' | 'franchise'
  branch_type: BranchType
  franchisee?: string
  region: string
}

export const TAMADA_ENTITIES = [
  { id: 'tamada', name: 'Tamada Clinic', name_th: 'Tamada Clinic (Aesthetic)', org_code: 'ORG-TAMADA' },
  { id: 'sdx', name: 'SDX Dental Division', name_th: 'SDX ทันตกรรม', org_code: 'ORG-SDX' },
  { id: 'franchise', name: 'Franchise Network', name_th: 'เครือข่าย Franchise', org_code: 'ORG-FRANCHISE' },
] as const

/** Branches จาก PDF — owned + franchise */
export const TAMADA_BRANCHES: TamadaBranch[] = [
  { code: 'SUT', name: 'สุทธิสาร', entity: 'tamada', branch_type: 'owned', region: 'Bangkok' },
  { code: 'PUN', name: 'ปุณณวิถี', entity: 'tamada', branch_type: 'owned', region: 'Bangkok' },
  { code: 'SYA', name: 'สามย่าน', entity: 'tamada', branch_type: 'owned', region: 'Bangkok' },
  { code: 'RNG', name: 'รังสิต', entity: 'franchise', branch_type: 'franchise', franchisee: 'Stoic Guild', region: 'Pathum Thani' },
  { code: 'RTB', name: 'รัตนาธิเบศร์', entity: 'franchise', branch_type: 'franchise', franchisee: 'Grace Over Pride', region: 'Nonthaburi' },
  { code: 'SDX-HQ', name: 'SDX Dental HQ', entity: 'sdx', branch_type: 'owned', region: 'Bangkok' },
]

export const TAMADA_DEPARTMENTS = [
  'Management', 'Finance', 'HR', 'Operation', 'Marketing', 'IT', 'Medical', 'Dental', 'Warehouse', 'Franchise',
]

export const TAMADA_SOPS = [
  { title: 'ขั้นตอนรับคนไข้ Aesthetic', layer: 'Operation', content: '1. ลงทะเบียน 2. วัด vital 3. Consult 4. Treatment 5. ชำระเงิน 6. Follow-up LINE', tier: 'T1', category: 'SOP' },
  { title: 'Daily Readiness Checklist', layer: 'Operation', content: 'ก่อน 09:00: แพทย์พร้อม · stock พอ · อุปกรณ์ OK · พนักงานครบ · ห้องพร้อม', tier: 'T1', category: 'SOP' },
  { title: 'นโยบาย No-show & Late Cancel', layer: 'Knowledge', content: 'LINE ยืนยัน 24 ชม. · no-show 2 ครั้ง = มัดจำ · late cancel ภายใน 2 ชม. = คิดค่าบริการ', tier: 'T1', category: 'Policy' },
  { title: 'Complaint Handling & Escalation', layer: 'Knowledge', content: 'บันทึก Work Log → หัวหน้า 24 ชม. → >48 ชม. escalate C-Suite · ผูก complaint_rate KPI', tier: 'T1', category: 'SOP' },
  { title: 'PDPA & Patient Data (T3)', layer: 'Knowledge', content: 'ข้อมูลคนไข้ T3 · เข้ารหัส · ไม่ส่ง raw PII ให้ AI · pseudonymize ก่อน analytics', tier: 'T3', category: 'Policy' },
  { title: 'SDX Dental Treatment Flow', layer: 'Operation', content: 'Consult → X-ray (ถ้าจำเป็น) → Treatment plan → Consent → Procedure → Aftercare', tier: 'T1', category: 'SOP' },
  { title: 'Franchise Brand Standards', layer: 'Knowledge', content: 'SOP adherence · visual identity · staff training · mystery shopper · Work Log evidence', tier: 'T1', category: 'Policy' },
  { title: 'Job Description Template — Medical Staff', layer: 'People', content: 'หน้าที่หลัก · KPI · Skill Required · Security Tier · อัปเดตรายไตรมาส', tier: 'T1', category: 'JD' },
]
