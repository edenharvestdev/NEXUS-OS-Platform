import { queryAll, queryOne, run, newId } from './db'
import { ROLE_SKILLS } from './nexus-extended-schema'

export async function recordSkillEvidence(
  companyId: string,
  userId: string,
  skillKey: string,
  sourceType: string,
  sourceId: string,
  points: number,
  note?: string,
): Promise<void> {
  const skills = await getSkillsForUser(companyId, userId)
  const skill = skills.find(s => s.key === skillKey) || { key: skillKey, name: skillKey }
  const dup = await queryOne(
    'SELECT id FROM skill_evidence WHERE company_id = $1 AND source_type = $2 AND source_id = $3 AND skill_key = $4',
    [companyId, sourceType, sourceId, skillKey],
  )
  if (dup) return

  await run(
    `INSERT INTO skill_evidence (id, company_id, user_id, source_type, source_id, skill_key, points, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [newId(), companyId, userId, sourceType, sourceId, skillKey, points, note || null],
  )

  const agg = await queryOne(
    `SELECT COALESCE(SUM(points),0) as total, COUNT(*) as cnt FROM skill_evidence
     WHERE company_id = $1 AND user_id = $2 AND skill_key = $3`,
    [companyId, userId, skillKey],
  )
  const existing = await queryOne(
    'SELECT id FROM skill_scores WHERE company_id = $1 AND user_id = $2 AND skill_key = $3',
    [companyId, userId, skillKey],
  )
  if (existing) {
    await run(
      'UPDATE skill_scores SET score = $1, evidence_count = $2 WHERE id = $3',
      [agg?.total || points, agg?.cnt || 1, existing.id],
    )
  } else {
    await run(
      `INSERT INTO skill_scores (id, company_id, user_id, skill_key, skill_name, score, evidence_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [newId(), companyId, userId, skillKey, skill.name, agg?.total || points, agg?.cnt || 1],
    )
  }
}

export async function getSkillsForUser(companyId: string, userId: string): Promise<Array<{ key: string; name: string }>> {
  const user = await queryOne('SELECT role FROM users WHERE id = $1 AND company_id = $2', [userId, companyId])
  const role = (user?.role || 'staff').toLowerCase()
  return ROLE_SKILLS[role] || ROLE_SKILLS.staff
}

export async function onWorkLogApproved(companyId: string, userId: string, logId: string, _role: string, kpiImpact: number): Promise<void> {
  const skills = await getSkillsForUser(companyId, userId)
  if (skills[0]) await recordSkillEvidence(companyId, userId, skills[0].key, 'work_log', logId, 10 + (kpiImpact || 0), 'Approved work log')
  if (skills[1]) await recordSkillEvidence(companyId, userId, skills[1].key, 'work_log', logId, 5, 'Secondary skill')
}

export async function getWallet(companyId: string, userId?: string): Promise<any[]> {
  const params: any[] = [companyId]
  let sql = `SELECT ss.*, u.name as user_name, u.role, u.department
    FROM skill_scores ss JOIN users u ON u.id = ss.user_id WHERE ss.company_id = $1`
  if (userId) { sql += ' AND ss.user_id = $2'; params.push(userId) }
  sql += ' ORDER BY ss.score DESC'
  return queryAll(sql, params)
}

export async function getRecommendations(companyId: string, userId: string): Promise<any> {
  const scores = await getWallet(companyId, userId)
  const weakest = [...scores].sort((a, b) => Number(a.score || 0) - Number(b.score || 0))[0]
  return {
    mentor: 'Senior in same department',
    course: weakest ? `Improve ${weakest.skill_name}` : 'Onboarding basics',
    next_task: 'Submit work log with evidence for skill points',
    skills: scores,
  }
}

export async function initUserSkills(companyId: string, userId: string, role: string): Promise<void> {
  const skills = ROLE_SKILLS[role.toLowerCase()] || ROLE_SKILLS.staff
  for (const s of skills) {
    const exists = await queryOne(
      'SELECT id FROM skill_scores WHERE company_id = $1 AND user_id = $2 AND skill_key = $3',
      [companyId, userId, s.key],
    )
    if (!exists) {
      await run(
        `INSERT INTO skill_scores (id, company_id, user_id, skill_key, skill_name, score, evidence_count)
         VALUES ($1,$2,$3,$4,$5,0,0)`,
        [newId(), companyId, userId, s.key, s.name],
      )
    }
  }
}
