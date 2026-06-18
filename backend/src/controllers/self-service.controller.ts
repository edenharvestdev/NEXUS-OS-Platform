import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'
import { encryptField, decryptField, canViewTier } from '../lib/encryption'
import { writeAudit } from '../lib/audit'
import { generateDailyTasks } from '../lib/daily-task-agent'
import { recordSkillEvidence } from '../lib/skill-wallet'

/** Unified self-service hub — every employee fills all layers from one place */
export async function getHub(req: Request, res: Response): Promise<void> {
  const uid = req.user.id
  const cid = req.user.company_id

  const [profile, capacity, dictionary, myKpis, myKnowledge, myPatients, myWorkLogs, mySkills, dailyTasks] = await Promise.all([
    queryOne('SELECT id, name, email, role, department, phone, leave_used, leave_total FROM users WHERE id = $1', [uid]),
    queryOne('SELECT * FROM user_capacity WHERE user_id = $1', [uid]),
    queryAll('SELECT * FROM data_dictionary WHERE company_id = $1 ORDER BY layer', [cid]),
    queryAll('SELECT * FROM kpi_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [uid]),
    queryAll('SELECT * FROM knowledge_items WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [uid]),
    queryAll('SELECT id, consent_given, consent_at, visit_date, created_at FROM patients WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [uid]),
    queryAll('SELECT * FROM work_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [uid]),
    queryAll('SELECT * FROM skill_scores WHERE user_id = $1', [uid]),
    queryAll('SELECT * FROM daily_ai_tasks WHERE user_id = $1 AND done = 0 ORDER BY created_at DESC', [uid]),
  ])

  res.json({
    profile,
    capacity: capacity || { hours_per_day: 8, workload_score: 50, skills_declared: '[]' },
    layers: {
      L0_dictionary: dictionary,
      L0_kpi_entries: myKpis,
      L1_profile: profile,
      L1_capacity: capacity,
      L3_knowledge: myKnowledge,
      L0_customer_patients: myPatients,
      L4_skills: mySkills,
      L5_work_logs: myWorkLogs,
      L2_daily_tasks: dailyTasks,
    },
  })
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { name, phone, department, hours_per_day, workload_score, skills_declared } = req.body
  const uid = req.user.id
  const cid = req.user.company_id

  if (name || phone || department) {
    await run(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), department = COALESCE($3, department) WHERE id = $4`,
      [name, phone, department, uid],
    )
  }

  const cap = await queryOne('SELECT user_id FROM user_capacity WHERE user_id = $1', [uid])
  const skillsJson = skills_declared ? JSON.stringify(skills_declared) : null
  if (cap) {
    await run(
      `UPDATE user_capacity SET hours_per_day = COALESCE($1, hours_per_day), workload_score = COALESCE($2, workload_score),
       skills_declared = COALESCE($3, skills_declared), updated_at = $4 WHERE user_id = $5`,
      [hours_per_day, workload_score, skillsJson, new Date().toISOString(), uid],
    )
  } else {
    await run(
      `INSERT INTO user_capacity (user_id, company_id, hours_per_day, workload_score, skills_declared) VALUES ($1,$2,$3,$4,$5)`,
      [uid, cid, hours_per_day || 8, workload_score || 50, skillsJson || '[]'],
    )
  }
  await writeAudit({ companyId: cid, userId: uid, action: 'self_profile_update', resource: 'user', resourceId: uid })
  res.json({ success: true })
}

export async function addKpiEntry(req: Request, res: Response): Promise<void> {
  const { metric_key, metric_name, value, period, note } = req.body
  if (!metric_key || value === undefined) { res.status(400).json({ error: 'metric_key and value required' }); return }
  const id = newId()
  await run(
    `INSERT INTO kpi_entries (id, company_id, user_id, metric_key, metric_name, value, period, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.company_id, req.user.id, metric_key, metric_name, Number(value), period || new Date().toISOString().slice(0, 10), note],
  )
  res.status(201).json({ id })
}

export async function addKnowledge(req: Request, res: Response): Promise<void> {
  const { title, content, layer, category, security_tier } = req.body
  if (!title || !content) { res.status(400).json({ error: 'title and content required' }); return }
  const id = newId()
  await run(
    `INSERT INTO knowledge_items (id, company_id, user_id, layer, title, content, category, security_tier)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.company_id, req.user.id, layer || 'Knowledge', title, content, category || 'SOP', security_tier || 'T1'],
  )
  await writeAudit({ companyId: req.user.company_id, userId: req.user.id, action: 'knowledge_create', resource: 'knowledge_items', resourceId: id })
  res.status(201).json({ id })
}

export async function addPatient(req: Request, res: Response): Promise<void> {
  const { name, phone, medical_notes, visit_date, consent_given } = req.body
  if (!name) { res.status(400).json({ error: 'name required' }); return }
  if (!consent_given) { res.status(400).json({ error: 'PDPA consent required (consent_given: true)' }); return }

  const id = newId()
  await run(
    `INSERT INTO patients (id, company_id, user_id, name_encrypted, phone_encrypted, consent_given, consent_at, medical_notes_encrypted, visit_date)
     VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8)`,
    [
      id, req.user.company_id, req.user.id,
      encryptField(name),
      phone ? encryptField(phone) : null,
      new Date().toISOString(),
      medical_notes ? encryptField(medical_notes) : null,
      visit_date || new Date().toISOString().slice(0, 10),
    ],
  )
  res.status(201).json({ id, consent_given: true })
}

export async function listPatients(req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    'SELECT * FROM patients WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.user.company_id],
  )
  const role = req.user.role
  res.json({
    data: rows.map((p: any) => ({
      id: p.id,
      visit_date: p.visit_date,
      consent_given: !!p.consent_given,
      name: canViewTier(role, 'T3') ? decryptField(p.name_encrypted) : '****',
      phone: p.phone_encrypted && canViewTier(role, 'T3') ? decryptField(p.phone_encrypted) : '****',
      created_at: p.created_at,
    })),
  })
}

export async function addSkillEvidence(req: Request, res: Response): Promise<void> {
  const { skill_key, skill_name, note, points } = req.body
  if (!skill_key) { res.status(400).json({ error: 'skill_key required' }); return }
  await recordSkillEvidence(req.user.company_id, req.user.id, skill_key, 'self_report', newId(), points || 5, note)
  res.json({ success: true })
}

export async function getDailyTasks(req: Request, res: Response): Promise<void> {
  const tasks = await generateDailyTasks(req.user.company_id, req.user.id, req.user.role)
  res.json({ data: tasks })
}

export async function completeDailyTask(req: Request, res: Response): Promise<void> {
  await run(
    'UPDATE daily_ai_tasks SET done = 1 WHERE id = $1 AND user_id = $2 AND company_id = $3',
    [String(req.params.id), req.user.id, req.user.company_id],
  )
  res.json({ success: true })
}

export async function createOwnDepartment(req: Request, res: Response): Promise<void> {
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return }
  const id = newId()
  await run('INSERT INTO departments (id, company_id, name, head_user_id) VALUES ($1,$2,$3,$4)', [id, req.user.company_id, name.trim(), req.user.id])
  await run('UPDATE users SET department = $1 WHERE id = $2', [name.trim(), req.user.id])
  res.status(201).json({ id, name: name.trim() })
}
