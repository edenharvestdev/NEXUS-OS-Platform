import { queryAll } from './db'

/** L3 unified memory search — SQL FTS across org knowledge (no external vector DB required) */
export async function searchMemory(companyId: string, q: string, limit = 20) {
  const term = `%${q.trim()}%`
  if (!q.trim()) return []

  const knowledge = await queryAll(
    `SELECT 'knowledge' as source, id, title, content, layer, created_at
     FROM knowledge_items WHERE company_id = $1 AND (title LIKE $2 OR content LIKE $2)
     ORDER BY created_at DESC LIMIT $3`,
    [companyId, term, limit],
  )

  const dictionary = await queryAll(
    `SELECT 'dictionary' as source, id, name as title, definition as content, layer, created_at
     FROM data_dictionary WHERE company_id = $1 AND (name LIKE $2 OR definition LIKE $2 OR metric_key LIKE $2)
     LIMIT $3`,
    [companyId, term, limit],
  )

  const worklogs = await queryAll(
    `SELECT 'worklog' as source, id, object as title, object as content, department as layer, created_at
     FROM work_logs WHERE company_id = $1 AND object LIKE $2
     ORDER BY created_at DESC LIMIT $3`,
    [companyId, term, limit],
  )

  const documents = await queryAll(
    `SELECT 'document' as source, id, name as title, COALESCE(summary, name) as content, 'Knowledge' as layer, created_at
     FROM documents WHERE company_id = $1 AND deleted_at IS NULL AND (name LIKE $2 OR summary LIKE $2)
     LIMIT $3`,
    [companyId, term, limit],
  )

  const patients = await queryAll(
    `SELECT 'patient' as source, id, 'Patient record' as title, visit_date as content, 'Customer' as layer, created_at
     FROM patients WHERE company_id = $1 AND visit_date LIKE $2
     LIMIT $3`,
    [companyId, term, limit],
  )

  return [...knowledge, ...dictionary, ...worklogs, ...documents, ...patients]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit)
}

export async function explainDrop(companyId: string, topic: string): Promise<string[]> {
  const results = await searchMemory(companyId, topic, 8)
  if (!results.length) return [`ไม่พบข้อมูลเกี่ยวกับ "${topic}" — ลองกรอก Work Log หรือ SOP ใน My Data`]
  return results.map(r => `[${r.source}/${r.layer}] ${r.title}: ${String(r.content).slice(0, 120)}`)
}
