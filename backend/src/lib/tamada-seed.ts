import { run, queryOne, newId } from './db'
import { TAMADA_DICTIONARY_SEED } from './tamada-data-taxonomy'
import { TAMADA_BRANCHES, TAMADA_SOPS, TAMADA_DEPARTMENTS, TAMADA_ENTITIES } from './tamada-entities'
import { writeAudit } from './audit'

export async function seedTamadaDictionary(companyId: string, userId: string): Promise<number> {
  let inserted = 0
  for (const m of TAMADA_DICTIONARY_SEED) {
    const dup = await queryOne(
      'SELECT id FROM data_dictionary WHERE company_id = $1 AND metric_key = $2',
      [companyId, m.metric_key],
    )
    if (dup) continue
    await run(
      `INSERT INTO data_dictionary (
        id, company_id, layer, metric_key, name, definition, formula, source, owner, security_tier,
        update_frequency, examples, domain, priority, entity
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        newId(), companyId, m.layer, m.metric_key, m.name, m.definition, m.formula, m.source, m.owner,
        m.security_tier, m.update_frequency || 'monthly', m.examples || m.nexus_layer,
        m.domain, m.priority, m.entity,
      ],
    )
    inserted++
  }
  if (inserted > 0) {
    await writeAudit({ companyId, userId, action: 'seed_tamada_dictionary', resource: 'data_dictionary', meta: { inserted } })
  }
  return inserted
}

export async function seedTamadaEntities(companyId: string, userId: string): Promise<number> {
  let inserted = 0
  for (const e of TAMADA_ENTITIES) {
    const dup = await queryOne(
      'SELECT id FROM entities WHERE company_id = $1 AND entity_key = $2',
      [companyId, e.id],
    )
    if (dup) continue
    await run(
      `INSERT INTO entities (id, company_id, entity_key, name, name_th, org_code)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId(), companyId, e.id, e.name, e.name_th, e.org_code],
    )
    inserted++
  }
  if (inserted > 0) {
    await writeAudit({ companyId, userId, action: 'seed_tamada_entities', resource: 'entities', meta: { inserted } })
  }
  return inserted
}

export async function seedTamadaBranches(companyId: string, userId: string): Promise<number> {
  let inserted = 0
  for (const b of TAMADA_BRANCHES) {
    const dup = await queryOne('SELECT id FROM branches WHERE company_id = $1 AND code = $2', [companyId, b.code])
    if (dup) continue
    await run(
      `INSERT INTO branches (id, company_id, code, name, entity, branch_type, franchisee, region)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [newId(), companyId, b.code, b.name, b.entity, b.branch_type, b.franchisee || null, b.region],
    )
    inserted++
  }
  if (inserted > 0) {
    await writeAudit({ companyId, userId, action: 'seed_tamada_branches', resource: 'branches', meta: { inserted } })
  }
  return inserted
}

export async function seedTamadaKnowledge(companyId: string, userId: string): Promise<number> {
  let inserted = 0
  for (const sop of TAMADA_SOPS) {
    const dup = await queryOne(
      'SELECT id FROM knowledge_items WHERE company_id = $1 AND title = $2',
      [companyId, sop.title],
    )
    if (dup) continue
    await run(
      `INSERT INTO knowledge_items (id, company_id, user_id, layer, title, content, category, security_tier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [newId(), companyId, userId, sop.layer, sop.title, sop.content, sop.category, sop.tier],
    )
    inserted++
  }
  if (inserted > 0) {
    await writeAudit({ companyId, userId, action: 'seed_tamada_knowledge', resource: 'knowledge_items', meta: { inserted } })
  }
  return inserted
}

export async function seedTamadaDepartments(companyId: string): Promise<number> {
  let inserted = 0
  for (const name of TAMADA_DEPARTMENTS) {
    const dup = await queryOne('SELECT id FROM departments WHERE company_id = $1 AND name = $2', [companyId, name])
    if (!dup) {
      await run('INSERT INTO departments (id, company_id, name) VALUES ($1,$2,$3)', [newId(), companyId, name])
      inserted++
    }
  }
  return inserted
}

export async function applyTamadaFullSeed(companyId: string, userId: string) {
  const departments = await seedTamadaDepartments(companyId)
  const entities = await seedTamadaEntities(companyId, userId)
  const dictionary = await seedTamadaDictionary(companyId, userId)
  const branches = await seedTamadaBranches(companyId, userId)
  const knowledge = await seedTamadaKnowledge(companyId, userId)
  await run('UPDATE companies SET industry = $1 WHERE id = $2', ['Tamada Clinic & SDX Dental', companyId])
  return { departments, entities, dictionary, branches, knowledge, total_metrics: TAMADA_DICTIONARY_SEED.length }
}

export async function getDictionaryTargetCount(companyId: string): Promise<number> {
  const company = await queryOne('SELECT industry FROM companies WHERE id = $1', [companyId])
  const ind = String(company?.industry || '').toLowerCase()
  if (ind.includes('tamada') || ind.includes('sdx')) return TAMADA_DICTIONARY_SEED.length
  return 10
}
