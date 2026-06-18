import { Request, Response } from 'express'
import { queryAll, run, newId } from '../lib/db'
import { writeAudit } from '../lib/audit'

const LAYERS = ['People', 'Customer', 'Financial', 'Operation', 'Knowledge', 'Performance']

export async function getAll(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const layer = req.query.layer as string | undefined
  const params: any[] = [cid]
  let sql = 'SELECT * FROM data_dictionary WHERE company_id = $1'
  if (layer && LAYERS.includes(layer)) {
    sql += ' AND layer = $2'
    params.push(layer)
  }
  sql += ' ORDER BY layer, metric_key'
  res.json(await queryAll(sql, params))
}

export async function create(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const { layer, metric_key, name, definition, formula, source, owner, security_tier, update_frequency, examples } = req.body
  if (!layer || !metric_key || !name || !definition) {
    res.status(400).json({ error: 'layer, metric_key, name, definition required' }); return
  }
  if (!LAYERS.includes(layer)) {
    res.status(400).json({ error: 'Invalid layer' }); return
  }
  const id = newId()
  await run(
    `INSERT INTO data_dictionary (id, company_id, layer, metric_key, name, definition, formula, source, owner, security_tier, update_frequency, examples)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, cid, layer, metric_key, name, definition, formula, source, owner, security_tier || 'T1', update_frequency || 'daily', examples || ''],
  )
  res.status(201).json({ id, company_id: cid, layer, metric_key, name, definition, formula, source, owner, security_tier: security_tier || 'T1' })
  await writeAudit({ companyId: cid, userId: req.user.id, action: 'dictionary_create', resource: 'data_dictionary', resourceId: id })
}

export async function update(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id
  const { definition, formula, source, owner, security_tier, update_frequency, examples } = req.body
  await run(
    `UPDATE data_dictionary SET definition = COALESCE($1, definition), formula = COALESCE($2, formula),
     source = COALESCE($3, source), owner = COALESCE($4, owner),
     security_tier = COALESCE($5, security_tier), update_frequency = COALESCE($6, update_frequency),
     examples = COALESCE($7, examples)
     WHERE id = $8 AND company_id = $9`,
    [definition, formula, source, owner, security_tier, update_frequency, examples, String(req.params.id), cid],
  )
  await writeAudit({ companyId: cid, userId: req.user.id, action: 'dictionary_update', resource: 'data_dictionary', resourceId: String(req.params.id) })
  res.json({ success: true })
}

export async function remove(req: Request, res: Response): Promise<void> {
  await run('DELETE FROM data_dictionary WHERE id = $1 AND company_id = $2', [String(req.params.id), req.user.company_id])
  await writeAudit({ companyId: req.user.company_id, userId: req.user.id, action: 'dictionary_delete', resource: 'data_dictionary', resourceId: String(req.params.id) })
  res.json({ success: true })
}

export async function getLayers(_req: Request, res: Response): Promise<void> {
  res.json(LAYERS.map(l => ({ layer: l, description: layerDescription(l) })))
}

function layerDescription(layer: string): string {
  const map: Record<string, string> = {
    People: 'พนักงาน, Job Desc, Skill',
    Customer: 'ลูกค้า, Retention, พฤติกรรม',
    Financial: 'รายรับ-รายจ่าย, ต้นทุน',
    Operation: 'งาน, Workflow, หน้างาน',
    Knowledge: 'SOP, คู่มือ, Policy',
    Performance: 'KPI, ผลงาน, คุณภาพ',
  }
  return map[layer] || layer
}
