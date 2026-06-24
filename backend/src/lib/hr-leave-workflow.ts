import { queryAll, queryOne, run, newId } from './db'
import { DEFAULT_LEAVE_APPROVAL_CONFIG } from './nexus-hr-phase6-schema'

export type ApprovalStep = { level: number; approver_role: string; label_th: string }

export async function ensureLeaveApprovalConfig(companyId: string): Promise<void> {
  const count = await queryOne(
    'SELECT COUNT(*) as c FROM leave_approval_config WHERE company_id = $1',
    [companyId],
  )
  if (Number(count?.c || 0) > 0) return
  for (const step of DEFAULT_LEAVE_APPROVAL_CONFIG) {
    const enabled = step.level <= 4 ? 1 : 0
    await run(
      `INSERT INTO leave_approval_config (company_id, level, approver_role, label_th, enabled) VALUES ($1,$2,$3,$4,$5)`,
      [companyId, step.level, step.approver_role, step.label_th, enabled],
    )
  }
}

export async function getEnabledLeaveSteps(companyId: string): Promise<ApprovalStep[]> {
  await ensureLeaveApprovalConfig(companyId)
  return queryAll(
    `SELECT level, approver_role, label_th FROM leave_approval_config
     WHERE company_id = $1 AND enabled = 1 ORDER BY level`,
    [companyId],
  )
}

export async function initLeaveApprovalSteps(companyId: string, leaveId: string): Promise<void> {
  const steps = await getEnabledLeaveSteps(companyId)
  for (const step of steps) {
    await run(
      `INSERT INTO leave_approval_steps (id, leave_id, company_id, level, approver_role, status) VALUES ($1,$2,$3,$4,$5,'pending')`,
      [newId(), leaveId, companyId, step.level, step.approver_role],
    )
  }
}

export async function syncEmployeeLeaveQuotas(companyId: string, userId: string, year?: number): Promise<void> {
  const y = year || new Date().getFullYear()
  const types = await queryAll('SELECT id, quota_days FROM leave_types WHERE company_id = $1', [companyId])
  for (const lt of types) {
    const ex = await queryOne(
      'SELECT id FROM employee_leave_quota WHERE user_id = $1 AND leave_type_id = $2 AND year = $3',
      [userId, lt.id, y],
    )
    if (!ex) {
      await run(
        `INSERT INTO employee_leave_quota (id, company_id, user_id, leave_type_id, year, quota_days, used_days)
         VALUES ($1,$2,$3,$4,$5,$6,0)`,
        [newId(), companyId, userId, lt.id, y, Number(lt.quota_days || 0)],
      )
    }
  }
}
