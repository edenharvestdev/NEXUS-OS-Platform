/** AI agent roles — 1 user = Personal AI · 1 dept = Dept AI · Admin = CEO/Command AI */

export type ChatScope = 'personal' | 'department' | 'company'

export const AI_AGENTS = {
  personal: {
    id: 'personal',
    name: 'Personal AI',
    name_th: 'AI ส่วนตัว',
    description: 'ผู้ช่วยส่วนตัว — จำงาน เป้าหมาย KPI Skill ไฟล์ของคุณ · ไม่เห็นข้อมูลคนอื่น',
    canPlan: true,
    canNotifyManager: true,
    memory: 'user',
    dataAccess: ['own_tasks', 'own_kpi', 'own_skills', 'own_files', 'own_work_logs', 'own_memory'],
    taskType: 'general',
    modelHint: 'Gemini 2.0 Flash',
  },
  department: {
    id: 'department',
    name: 'Department AI',
    name_th: 'AI แผนก',
    description: 'ผู้ช่วยแผนก — วางแผนงานทีม ดู KPI แผนก แนะนำมอบหมายงานจาก Skill',
    canPlan: true,
    canAssignTasks: true,
    memory: 'department',
    dataAccess: ['dept_users', 'dept_work_logs', 'dept_kpi', 'dept_skills', 'dept_sop'],
    taskType: 'thai_market',
    modelHint: 'Typhoon v2 → Gemini fallback',
  },
  company: {
    id: 'company',
    name: 'CEO / Command AI',
    name_th: 'AI ผู้บริหาร',
    description: 'มองเห็นทั้งองค์กร — API/KPI รวม วางแกนระบบ ตรวจสอบทุกแผนก (Admin/CEO เท่านั้น)',
    canPlan: true,
    canViewAll: true,
    memory: 'org',
    dataAccess: ['all_users', 'all_kpi', 'all_skills', 'api_usage', 'audit', 'departments'],
    taskType: 'strategy',
    modelHint: 'Claude Sonnet 4 → Gemini fallback',
  },
} as const

export function resolveSessionId(scope: ChatScope, user: { id: string; department?: string }): string {
  if (scope === 'personal') return `p:${user.id}`
  if (scope === 'department') return `d:${user.department || 'Operation'}`
  return 'c:company'
}

export function canUseScope(scope: ChatScope, role: string): boolean {
  const r = (role || 'staff').toLowerCase()
  if (scope === 'company') return r === 'admin'
  return true
}

/** Map chat scope → AI router task_type */
export function taskTypeForScope(scope: ChatScope): string {
  return AI_AGENTS[scope].taskType
}

export function buildSystemPrompt(scope: ChatScope, ctx: {
  userName: string
  department?: string
  companyName: string
  agentDuties: string
  contextBlock: string
}): string {
  const agent = AI_AGENTS[scope]
  return `คุณคือ ${agent.name_th} (${agent.name}) ของ NEXUS OS
ผู้ใช้: ${ctx.userName}${ctx.department ? ` · แผนก ${ctx.department}` : ''}
องค์กร: ${ctx.companyName}

หน้าที่ของคุณ:
${ctx.agentDuties}

กฎ:
- Copilot ไม่ใช่ Autopilot — ตอบจากข้อมูลด้านล่างเท่านั้น
- ถ้าไม่มีข้อมูล ให้บอกว่าไม่ทราบ และแนะนำให้ผู้ใช้กรอกใน My Data / Work Log
- เมื่อพนักงานรายงานงานเสร็จ ให้สรุปสั้นๆ และบอกว่าระบบจะแจ้งหัวหน้าแผนกอัตโนมัติ

${ctx.contextBlock}`
}

export function agentDutiesText(scope: ChatScope): string {
  if (scope === 'personal') {
    return `- ช่วยวางแผนงานรายวัน/รายสัปดาห์ของผู้ใช้
- จำความชอบ เป้าหมาย งานที่ค้าง (จาก memory + daily tasks)
- แนะนำให้อัปเดต Work Log เมื่องานเสร็จ
- ไม่เปิดเผยข้อมูลพนักงานคนอื่น`
  }
  if (scope === 'department') {
    return `- ช่วยหัวหน้าแผนกติดตามงานที่ส่งวันนี้
- แนะนำมอบหมายงานจาก Skill Score + KPI รายคน
- สรุปสถานะแผนกและงานรออนุมัติ
- ใช้ได้เฉพาะข้อมูลในแผนกเดียวกัน`
  }
  return `- มองภาพรวมทั้งบริษัท (ทุกแผนก)
- ตรวจ API usage / KPI trends / Skill gaps
- วางแผนระบบและ onboarding
- สรุปให้ CEO ก่อนตัดสินใจ`
}
