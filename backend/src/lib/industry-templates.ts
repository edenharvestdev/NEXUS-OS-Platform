import { CLINIC_DICTIONARY_SEED } from './nexus-schema'
import { DEFAULT_DEPARTMENTS } from './nexus-extended-schema'

export type IndustryId = 'clinic' | 'restaurant' | 'factory' | 'insurance' | 'realestate' | 'generic'

export interface IndustryTemplate {
  id: IndustryId
  name: string
  name_th: string
  departments: string[]
  dictionary: typeof CLINIC_DICTIONARY_SEED
  sops: Array<{ title: string; layer: string; content: string; tier: string }>
  roles: Array<{ role: string; dept: string; skills: Array<{ key: string; name: string }> }>
}

const clinicSops = [
  { title: 'ขั้นตอนรับคนไข้', layer: 'Operation', content: '1. ลงทะเบียน 2. วัด vital 3. พบแพทย์ 4. ชำระเงิน', tier: 'T1' },
  { title: 'นโยบาย No-show', layer: 'Knowledge', content: 'โทรยืนยันนัด 24 ชม.ก่อน · เกิน 2 ครั้ง = มัดจำ', tier: 'T1' },
  { title: 'การจัดการ Complaint', layer: 'Knowledge', content: 'บันทึก complaint → หัวหน้า Operation ตรวจภายใน 24 ชม.', tier: 'T1' },
]

export const INDUSTRY_TEMPLATES: Record<IndustryId, IndustryTemplate> = {
  clinic: {
    id: 'clinic', name: 'Clinic', name_th: 'คลินิก',
    departments: ['Management', 'Finance', 'HR', 'Operation', 'Marketing', 'IT'],
    dictionary: CLINIC_DICTIONARY_SEED,
    sops: clinicSops,
    roles: [
      { role: 'admin', dept: 'Management', skills: [{ key: 'leadership', name: 'Leadership' }, { key: 'strategy', name: 'Strategy' }] },
      { role: 'staff', dept: 'Operation', skills: [{ key: 'patient_care', name: 'Patient Care' }, { key: 'quality', name: 'Quality' }] },
    ],
  },
  restaurant: {
    id: 'restaurant', name: 'Restaurant', name_th: 'ร้านอาหาร',
    departments: ['Management', 'Kitchen', 'Service', 'Finance', 'Marketing'],
    dictionary: [
      { layer: 'Financial', metric_key: 'food_cost_pct', name: 'Food Cost %', definition: 'ต้นทุนอาหาร ÷ ยอดขาย', formula: 'food_cost/sales*100', source: 'POS', owner: 'Finance', security_tier: 'T2' },
      { layer: 'Performance', metric_key: 'table_turnover', name: 'Table Turnover', definition: 'จำนวนรอบโต๊ะต่อวัน', formula: 'covers/tables', source: 'POS', owner: 'Operation', security_tier: 'T1' },
      { layer: 'Customer', metric_key: 'repeat_rate', name: 'Repeat Customer Rate', definition: 'ลูกค้าซ้ำ 30 วัน', formula: 'repeat/total*100', source: 'CRM', owner: 'Marketing', security_tier: 'T1' },
      { layer: 'Performance', metric_key: 'waste_rate', name: 'Waste Rate', definition: 'ของเสีย ÷ วัตถุดิบ', formula: 'waste/ingredients*100', source: 'Kitchen', owner: 'Kitchen', security_tier: 'T1' },
    ],
    sops: [{ title: 'มาตรฐานครัว', layer: 'Operation', content: 'FIFO · ตรวจอุณหภูมิ · ล้างมือ', tier: 'T1' }],
    roles: [{ role: 'staff', dept: 'Service', skills: [{ key: 'service', name: 'Service' }, { key: 'quality', name: 'Quality' }] }],
  },
  factory: {
    id: 'factory', name: 'Factory', name_th: 'โรงงาน',
    departments: ['Management', 'Production', 'QC', 'Finance', 'HR', 'Maintenance'],
    dictionary: [
      { layer: 'Performance', metric_key: 'oee', name: 'OEE', definition: 'Overall Equipment Effectiveness', formula: 'availability*performance*quality', source: 'MES', owner: 'Production', security_tier: 'T1' },
      { layer: 'Performance', metric_key: 'defect_rate', name: 'Defect Rate', definition: 'ของเสีย ÷ ผลผลิต', formula: 'defects/total*100', source: 'QC', owner: 'QC', security_tier: 'T1' },
    ],
    sops: [{ title: 'Safety First', layer: 'Knowledge', content: 'PPE บังคับ · Lock-out/Tag-out', tier: 'T0' }],
    roles: [{ role: 'staff', dept: 'Production', skills: [{ key: 'production', name: 'Production' }, { key: 'safety', name: 'Safety' }] }],
  },
  insurance: {
    id: 'insurance', name: 'Insurance', name_th: 'ประกัน',
    departments: ['Management', 'Underwriting', 'Claims', 'Sales', 'Finance'],
    dictionary: [
      { layer: 'Financial', metric_key: 'loss_ratio', name: 'Loss Ratio', definition: 'Claims ÷ Premium', formula: 'claims/premium*100', source: 'Core', owner: 'Finance', security_tier: 'T2' },
    ],
    sops: [{ title: 'Claims Process', layer: 'Operation', content: 'Verify → Assess → Approve → Pay', tier: 'T2' }],
    roles: [{ role: 'staff', dept: 'Claims', skills: [{ key: 'claims', name: 'Claims Processing' }] }],
  },
  realestate: {
    id: 'realestate', name: 'Real Estate', name_th: 'อสังหาฯ',
    departments: ['Management', 'Sales', 'Marketing', 'Finance', 'Legal'],
    dictionary: [
      { layer: 'Financial', metric_key: 'conversion_rate', name: 'Lead Conversion', definition: 'ปิดการขาย ÷ leads', formula: 'closed/leads*100', source: 'CRM', owner: 'Sales', security_tier: 'T1' },
    ],
    sops: [{ title: 'Showing Protocol', layer: 'Operation', content: 'นัดหมาย · บันทึก feedback · follow-up 48h', tier: 'T1' }],
    roles: [{ role: 'sales', dept: 'Sales', skills: [{ key: 'sales', name: 'Sales' }, { key: 'negotiation', name: 'Negotiation' }] }],
  },
  generic: {
    id: 'generic', name: 'Generic SME', name_th: 'SME ทั่วไป',
    departments: DEFAULT_DEPARTMENTS,
    dictionary: CLINIC_DICTIONARY_SEED.slice(0, 2),
    sops: [{ title: 'Company Handbook', layer: 'Knowledge', content: 'กรอก SOP ขององค์กรคุณที่นี่', tier: 'T1' }],
    roles: [{ role: 'staff', dept: 'Operation', skills: [{ key: 'execution', name: 'Execution' }] }],
  },
}

export function getTemplate(id: string): IndustryTemplate {
  return INDUSTRY_TEMPLATES[(id as IndustryId)] || INDUSTRY_TEMPLATES.generic
}

export const INDUSTRY_LIST = Object.values(INDUSTRY_TEMPLATES).map(t => ({
  id: t.id, name: t.name, name_th: t.name_th,
}))
