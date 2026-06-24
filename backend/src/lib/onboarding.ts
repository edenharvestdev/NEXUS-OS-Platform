import { queryAll, queryOne, run, newId } from './db'
import { INDUSTRY_LIST, getTemplate } from './industry-templates'
import { getDictionaryTargetCount, applyTamadaFullSeed } from './tamada-seed'
import { writeAudit } from './audit'
import {
  ONBOARDING_PHASES,
  ONBOARDING_TASKS,
  SECURITY_CHECKLIST,
  SECURITY_TIERS,
  WORK_LOG_FIELDS,
  WORKBOOK_GUIDE,
  CLINIC_DICTIONARY_SEED,
} from './workbook-template'

export { INDUSTRY_LIST, getTemplate, CLINIC_DICTIONARY_SEED }

type TaskStatus = 'pending' | 'in_progress' | 'done'

function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  try { return JSON.parse(String(raw)) } catch { return {} }
}

async function persistMeta(companyId: string, meta: Record<string, unknown>) {
  await run(
    `UPDATE onboarding_state SET meta = $1, updated_at = $2 WHERE company_id = $3`,
    [JSON.stringify(meta), new Date().toISOString(), companyId],
  )
}

/** Refresh auto-detected onboarding flags from live data */
export async function refreshOnboardingMeta(companyId: string, meta: Record<string, unknown>): Promise<Record<string, unknown>> {
  const ingestCount = Number((await queryOne(
    'SELECT COUNT(*) as c FROM ingestion_jobs WHERE company_id = $1',
    [companyId],
  ))?.c || 0)
  if (ingestCount > 0) meta.sources_done = true

  const jdCount = Number((await queryOne(
    `SELECT COUNT(*) as c FROM knowledge_items WHERE company_id = $1 AND (
      category IN ('JD','Job Description','job_description') OR title LIKE '%Job Description%'
    )`,
    [companyId],
  ))?.c || 0)
  const deptCount = Number((await queryOne('SELECT COUNT(*) as c FROM departments WHERE company_id = $1', [companyId]))?.c || 0)
  const userCount = Number((await queryOne('SELECT COUNT(*) as c FROM users WHERE company_id = $1', [companyId]))?.c || 0)
  if (jdCount > 0 || (deptCount >= 7 && userCount >= 2)) meta.jd_done = true

  const company = await queryOne('SELECT settings FROM companies WHERE id = $1', [companyId])
  let settings: Record<string, unknown> = {}
  try { settings = JSON.parse(String(company?.settings || '{}')) } catch { /* ignore */ }
  if (settings.ai_decision_rights) meta.ai_decision_done = true

  return meta
}

export async function markSourcesImported(companyId: string): Promise<void> {
  const state = await queryOne('SELECT meta FROM onboarding_state WHERE company_id = $1', [companyId])
  if (!state) return
  const meta = parseMeta(state.meta)
  meta.sources_done = true
  await persistMeta(companyId, meta)
  await syncOnboardingCompletion(companyId)
}

export async function confirmDecisionRights(companyId: string, userId: string, rights: Record<string, string>): Promise<void> {
  const company = await queryOne('SELECT settings FROM companies WHERE id = $1', [companyId])
  let settings: Record<string, unknown> = {}
  try { settings = JSON.parse(String(company?.settings || '{}')) } catch { /* ignore */ }
  settings.ai_decision_rights = rights
  await run('UPDATE companies SET settings = $1 WHERE id = $2', [JSON.stringify(settings), companyId])

  const state = await queryOne('SELECT meta FROM onboarding_state WHERE company_id = $1', [companyId])
  const meta = parseMeta(state?.meta)
  meta.ai_decision_done = true
  await persistMeta(companyId, meta)
  await writeAudit({ companyId, userId, action: 'ai_decision_rights', resource: 'onboarding', meta: rights })
  await syncOnboardingCompletion(companyId)
}

export async function syncOnboardingCompletion(companyId: string): Promise<void> {
  const state = await queryOne('SELECT meta FROM onboarding_state WHERE company_id = $1', [companyId])
  if (!state) return
  let meta = parseMeta(state.meta)
  meta = await refreshOnboardingMeta(companyId, meta)
  await persistMeta(companyId, meta)
  const board = await buildOnboardingTasks(companyId, meta)
  if (board.doneCount >= board.total) {
    await run(
      `UPDATE onboarding_state SET completed = 1, step = 6, updated_at = $1 WHERE company_id = $2`,
      [new Date().toISOString(), companyId],
    )
  }
}

async function loadSignals(companyId: string) {
  const dictTarget = await getDictionaryTargetCount(companyId)
  const company = await queryOne('SELECT industry FROM companies WHERE id = $1', [companyId])
  const ind = String(company?.industry || '').toLowerCase()
  const deptTarget = ind.includes('tamada') || ind.includes('sdx') ? 10 : 7
  const dictCount = Number((await queryOne('SELECT COUNT(*) as c FROM data_dictionary WHERE company_id = $1', [companyId]))?.c || 0)
  const dictWithFormula = Number((await queryOne(
    `SELECT COUNT(*) as c FROM data_dictionary WHERE company_id = $1 AND formula IS NOT NULL AND formula != '' AND formula != '—'`,
    [companyId],
  ))?.c || 0)
  const dictWithTier = Number((await queryOne(
    `SELECT COUNT(*) as c FROM data_dictionary WHERE company_id = $1 AND security_tier IS NOT NULL`,
    [companyId],
  ))?.c || 0)
  const deptCount = Number((await queryOne('SELECT COUNT(*) as c FROM departments WHERE company_id = $1', [companyId]))?.c || 0)
  const userCount = Number((await queryOne('SELECT COUNT(*) as c FROM users WHERE company_id = $1', [companyId]))?.c || 0)
  const roleCount = Number((await queryOne('SELECT COUNT(DISTINCT role) as c FROM users WHERE company_id = $1', [companyId]))?.c || 0)
  const knowledgeCount = Number((await queryOne('SELECT COUNT(*) as c FROM knowledge_items WHERE company_id = $1', [companyId]))?.c || 0)
  const knowledgeCats = Number((await queryOne(
    `SELECT COUNT(DISTINCT category) as c FROM knowledge_items WHERE company_id = $1`,
    [companyId],
  ))?.c || 0)
  const skillCount = Number((await queryOne('SELECT COUNT(*) as c FROM skill_scores WHERE company_id = $1', [companyId]))?.c || 0)
  const workLogCount = Number((await queryOne('SELECT COUNT(*) as c FROM work_logs WHERE company_id = $1', [companyId]))?.c || 0)
  const auditCount = Number((await queryOne('SELECT COUNT(*) as c FROM audit_log WHERE company_id = $1', [companyId]))?.c || 0)
  const patientCount = Number((await queryOne('SELECT COUNT(*) as c FROM patients WHERE company_id = $1', [companyId]))?.c || 0)
  const aiConfigured = !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)

  return {
    dictionary: dictCount,
    dictTarget,
    dictionary_full: dictCount >= dictTarget,
    dictionary_formula: dictWithFormula >= Math.min(dictCount, 8),
    dictionary_tier: dictWithTier >= dictCount && dictCount > 0,
    departments: deptCount,
    deptTarget,
    users: userCount,
    knowledge: knowledgeCount,
    deptCount,
    userCount,
    roleCount,
    knowledgeCount,
    knowledgeCats,
    skillCount,
    workLogCount,
    auditCount,
    patientCount,
    aiConfigured,
  }
}

function autoCompleteTask(autoKey: string | undefined, s: Awaited<ReturnType<typeof loadSignals>>, meta: Record<string, unknown>): TaskStatus {
  if (!autoKey) return 'pending'
  switch (autoKey) {
    case 'departments': return s.deptCount >= (s.deptTarget || 7) ? 'done' : s.deptCount >= 1 ? 'in_progress' : 'pending'
    case 'workflow': return s.knowledgeCount >= 2 ? 'done' : s.knowledgeCount >= 1 ? 'in_progress' : 'pending'
    case 'sources': return meta.sources_done ? 'done' : 'pending'
    case 'dictionary_full': return s.dictionary_full ? 'done' : s.dictionary >= 4 ? 'in_progress' : 'pending'
    case 'dictionary_formula': return s.dictionary_formula ? 'done' : s.dictionary >= 1 ? 'in_progress' : 'pending'
    case 'dictionary_tier': return s.dictionary_tier ? 'done' : 'pending'
    case 'knowledge': return s.knowledgeCount >= 3 ? 'done' : s.knowledgeCount >= 1 ? 'in_progress' : 'pending'
    case 'knowledge_categories': return s.knowledgeCats >= 3 ? 'done' : s.knowledgeCats >= 1 ? 'in_progress' : 'pending'
    case 'job_descriptions': return meta.jd_done ? 'done' : 'pending'
    case 'skills': return s.skillCount >= 1 ? 'done' : 'pending'
    case 'work_logs': return s.workLogCount >= 1 ? 'done' : 'pending'
    case 'rbac': return s.roleCount >= 3 && s.userCount >= 2 ? 'done' : s.userCount >= 2 ? 'in_progress' : 'pending'
    case 'pilot_users': return s.userCount >= 2 ? 'done' : s.userCount >= 1 ? 'in_progress' : 'pending'
    case 'ai_connector': return s.aiConfigured ? 'done' : 'pending'
    case 'ai_decision': return meta.ai_decision_done ? 'done' : s.aiConfigured ? 'in_progress' : 'pending'
    default: return 'pending'
  }
}

function resolveTaskStatus(taskId: string, auto: TaskStatus, manual: Record<string, string>): TaskStatus {
  if (manual[taskId] === 'done') return 'done'
  if (manual[taskId] === 'pending') return auto === 'done' ? 'in_progress' : auto
  return auto
}

export async function buildOnboardingTasks(companyId: string, meta: Record<string, unknown>) {
  const signals = await loadSignals(companyId)
  const manual = (meta.task_status || {}) as Record<string, string>
  const tasks = ONBOARDING_TASKS.map(t => {
    const auto = autoCompleteTask(t.autoKey, signals, meta)
    const status = resolveTaskStatus(t.id, auto, manual)
    return { ...t, status, auto_status: auto }
  })
  const doneCount = tasks.filter(t => t.status === 'done').length
  const phases = ONBOARDING_PHASES.map(p => ({
    ...p,
    tasks: tasks.filter(t => t.phase === p.id),
    done: tasks.filter(t => t.phase === p.id && t.status === 'done').length,
    total: tasks.filter(t => t.phase === p.id).length,
  }))
  return { tasks, phases, doneCount, total: tasks.length, progress_pct: Math.round((doneCount / tasks.length) * 100) }
}

export async function evaluateSecurityChecklist(companyId: string) {
  const signals = await loadSignals(companyId)
  const encryptionOk = !!process.env.ENCRYPTION_KEY || process.env.NODE_ENV !== 'production'
  const auditOk = signals.auditCount > 0
  const patientOk = signals.patientCount === 0 || encryptionOk

  const checks: Record<string, boolean> = {
    promo_hours: signals.dictionary >= 1,
    sop_manual: signals.knowledgeCount >= 1,
    kpi_schedule: signals.dictionary >= 3,
    revenue_cost: signals.dictionary >= 1 && encryptionOk,
    strategy: signals.knowledgeCount >= 1,
    hr_data: encryptionOk && signals.userCount >= 1,
    patient_health: patientOk,
    financial_pii: encryptionOk,
  }

  return SECURITY_CHECKLIST.map(item => ({
    ...item,
    status: checks[item.id] ? 'done' : 'pending',
    status_label: checks[item.id] ? '☑ จัดแล้ว' : '☐ ยังไม่จัด',
  }))
}

export async function getWorkbookTemplate() {
  return {
    guide: WORKBOOK_GUIDE,
    dictionary_template: CLINIC_DICTIONARY_SEED,
    security_checklist: SECURITY_CHECKLIST,
    security_tiers: SECURITY_TIERS,
    work_log_fields: WORK_LOG_FIELDS,
    onboarding_phases: ONBOARDING_PHASES,
    onboarding_tasks: ONBOARDING_TASKS,
  }
}

export async function getOnboardingState(companyId: string) {
  let state = await queryOne('SELECT * FROM onboarding_state WHERE company_id = $1', [companyId])
  if (!state) {
    await run(
      `INSERT INTO onboarding_state (company_id, industry, step, completed, meta) VALUES ($1, 'generic', 0, 0, '{}')`,
      [companyId],
    )
    state = { company_id: companyId, industry: 'generic', step: 0, completed: 0, meta: '{}' }
  }
  const meta = await refreshOnboardingMeta(companyId, parseMeta(state.meta))
  await persistMeta(companyId, meta)
  const company = await queryOne('SELECT name, industry FROM companies WHERE id = $1', [companyId])
  const signals = await loadSignals(companyId)
  const taskBoard = await buildOnboardingTasks(companyId, meta)
  await syncOnboardingCompletion(companyId)
  const securityChecklist = await evaluateSecurityChecklist(companyId)
  const freshState = await queryOne('SELECT * FROM onboarding_state WHERE company_id = $1', [companyId])

  return {
    ...freshState,
    meta,
    company_name: company?.name,
    workbook: WORKBOOK_GUIDE,
    progress: {
      dictionary: signals.dictionary,
      dictionary_target: signals.dictTarget,
      departments: signals.deptCount,
      departments_target: signals.deptTarget,
      users: signals.userCount,
      knowledge: signals.knowledgeCount,
      work_logs: signals.workLogCount,
      skills: signals.skillCount,
    },
    task_board: taskBoard,
    security_checklist: securityChecklist,
    templates: INDUSTRY_LIST,
    steps: ONBOARDING_PHASES.map((p, i) => ({ id: i, key: p.key, label: p.label })),
  }
}

export async function setIndustry(companyId: string, industry: string, userId: string) {
  const tpl = getTemplate(industry)
  await run('UPDATE companies SET industry = $1 WHERE id = $2', [tpl.name, companyId])
  const exists = await queryOne('SELECT company_id FROM onboarding_state WHERE company_id = $1', [companyId])
  if (exists) {
    await run(
      `UPDATE onboarding_state SET industry = $1, step = CASE WHEN step < 1 THEN 1 ELSE step END, updated_at = $2 WHERE company_id = $3`,
      [tpl.id, new Date().toISOString(), companyId],
    )
  } else {
    await run(
      `INSERT INTO onboarding_state (company_id, industry, step, completed) VALUES ($1, $2, 1, 0)`,
      [companyId, tpl.id],
    )
  }
  await writeAudit({ companyId, userId, action: 'onboarding_industry', resource: 'onboarding', meta: { industry: tpl.id } })
  return tpl
}

export async function applyTemplate(companyId: string, industry: string, userId: string) {
  if (industry === 'tamada') {
    const seeded = await applyTamadaFullSeed(companyId, userId)
    await run(
      `INSERT INTO knowledge_items (id, company_id, user_id, layer, title, content, category, security_tier)
       VALUES ($1,$2,$3,'People',$4,$5,'JD','T1')`,
      [newId(), companyId, userId, 'Job Description — Tamada & SDX', 'Template JD จาก Data-Driven Org PDF — แก้ไขตาม role'],
    )
    await run(
      `UPDATE onboarding_state SET industry = $1, step = 3, updated_at = $2 WHERE company_id = $3`,
      ['tamada', new Date().toISOString(), companyId],
    )
    await writeAudit({ companyId, userId, action: 'onboarding_apply_template', resource: 'onboarding', meta: { industry: 'tamada', ...seeded } })
    await syncOnboardingCompletion(companyId)
    return { applied: 'tamada', ...seeded, sops: seeded.knowledge }
  }

  const tpl = getTemplate(industry)
  for (const m of tpl.dictionary) {
    const dup = await queryOne('SELECT id FROM data_dictionary WHERE company_id = $1 AND metric_key = $2', [companyId, m.metric_key])
    if (!dup) {
      await run(
        `INSERT INTO data_dictionary (id, company_id, layer, metric_key, name, definition, formula, source, owner, security_tier, update_frequency, examples)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          newId(), companyId, m.layer, m.metric_key, m.name, m.definition, m.formula, m.source, m.owner, m.security_tier,
          m.update_frequency || 'daily', m.examples || '',
        ],
      )
    }
  }
  for (const name of tpl.departments) {
    const exists = await queryOne('SELECT id FROM departments WHERE company_id = $1 AND name = $2', [companyId, name])
    if (!exists) await run('INSERT INTO departments (id, company_id, name) VALUES ($1,$2,$3)', [newId(), companyId, name])
  }
  for (const sop of tpl.sops) {
    await run(
      `INSERT INTO knowledge_items (id, company_id, user_id, layer, title, content, category, security_tier)
       VALUES ($1,$2,$3,$4,$5,$6,'SOP',$7)`,
      [newId(), companyId, userId, sop.layer, sop.title, sop.content, sop.tier],
    )
  }
  await run(
    `INSERT INTO knowledge_items (id, company_id, user_id, layer, title, content, category, security_tier)
     VALUES ($1,$2,$3,'People',$4,$5,'JD','T1')`,
    [
      newId(), companyId, userId,
      `Job Description — ${tpl.name_th}`,
      'Template JD จาก Workbook — แก้ไขให้ตรงบทบาทแต่ละแผนก',
    ],
  )
  await run(
    `UPDATE onboarding_state SET industry = $1, step = 3, updated_at = $2 WHERE company_id = $3`,
    [tpl.id, new Date().toISOString(), companyId],
  )
  await writeAudit({ companyId, userId, action: 'onboarding_apply_template', resource: 'onboarding', meta: { industry: tpl.id } })
  await syncOnboardingCompletion(companyId)
  return { applied: tpl.id, dictionary: tpl.dictionary.length, departments: tpl.departments.length, sops: tpl.sops.length }
}

export async function advanceStep(companyId: string, step: number) {
  await run(
    `UPDATE onboarding_state SET step = $1, updated_at = $2 WHERE company_id = $3`,
    [step, new Date().toISOString(), companyId],
  )
  await syncOnboardingCompletion(companyId)
}

/** Admin may skip optional workbook — unlocks full app without blocking login */
export async function completeOnboarding(companyId: string, userId: string) {
  await run(
    `UPDATE onboarding_state SET completed = 1, step = 6, updated_at = $1 WHERE company_id = $2`,
    [new Date().toISOString(), companyId],
  )
  await writeAudit({ companyId, userId, action: 'onboarding_skip', resource: 'onboarding' })
}

export async function updateTaskStatus(companyId: string, taskId: string, status: string) {
  const state = await queryOne('SELECT meta FROM onboarding_state WHERE company_id = $1', [companyId])
  const meta = parseMeta(state?.meta)
  const taskStatus = (meta.task_status || {}) as Record<string, string>
  taskStatus[taskId] = status
  meta.task_status = taskStatus
  await persistMeta(companyId, meta)
  await syncOnboardingCompletion(companyId)
  return meta
}

export async function createDepartment(companyId: string, name: string, userId: string) {
  const id = newId()
  await run('INSERT INTO departments (id, company_id, name, head_user_id) VALUES ($1,$2,$3,$4)', [id, companyId, name, userId])
  return { id, name }
}
