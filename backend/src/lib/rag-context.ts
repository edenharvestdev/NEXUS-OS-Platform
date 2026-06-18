import { queryAll } from './db'
import { canViewTier } from './encryption'

export interface RAGContext {
  text: string
  sources: string[]
}

export async function buildOrgContext(companyId: string, viewerRole: string): Promise<RAGContext> {
  const sources: string[] = []
  const parts: string[] = ['=== NEXUS OS Organizational Context (Grounded) ===']

  const emps = await queryAll(
    "SELECT name, role, department FROM users WHERE company_id = $1 AND status = 'active' LIMIT 20",
    [companyId],
  )
  if (emps.length) {
    parts.push(`People (${emps.length}): ${emps.map((e: any) => `${e.name} [${e.role}/${e.department}]`).join(', ')}`)
    sources.push('users')
  }

  if (canViewTier(viewerRole, 'T1')) {
    const mtgs = await queryAll(
      'SELECT title, summary FROM meetings WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5',
      [companyId],
    )
    for (const m of mtgs) {
      parts.push(`Meeting: ${m.title} — ${m.summary || 'no summary'}`)
      sources.push(`meeting:${m.title}`)
    }
  }

  if (canViewTier(viewerRole, 'T1')) {
    const docs = await queryAll(
      'SELECT name, summary, risk_level FROM documents WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5',
      [companyId],
    )
    for (const d of docs) {
      parts.push(`Document: ${d.name} (${d.risk_level || 'n/a'}) — ${d.summary || ''}`)
      sources.push(`document:${d.name}`)
    }
  }

  if (canViewTier(viewerRole, 'T2')) {
    const tx = await queryAll(
      `SELECT type, SUM(amount) as total FROM transactions WHERE company_id = $1 AND status = 'approved' GROUP BY type`,
      [companyId],
    )
    for (const t of tx) {
      parts.push(`Finance ${t.type}: ฿${Number(t.total || 0).toLocaleString()}`)
      sources.push(`transactions:${t.type}`)
    }
  }

  const dict = await queryAll(
    'SELECT metric_key, name, definition FROM data_dictionary WHERE company_id = $1 LIMIT 10',
    [companyId],
  )
  for (const d of dict) {
    parts.push(`KPI ${d.name} (${d.metric_key}): ${d.definition}`)
    sources.push(`dictionary:${d.metric_key}`)
  }

  const knowledge = await queryAll(
    'SELECT title, content, layer FROM knowledge_items WHERE company_id = $1 ORDER BY created_at DESC LIMIT 8',
    [companyId],
  )
  for (const k of knowledge) {
    parts.push(`Knowledge [${k.layer}]: ${k.title} — ${String(k.content).slice(0, 200)}`)
    sources.push(`knowledge:${k.title}`)
  }

  const logs = await queryAll(
    `SELECT object, status FROM work_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [companyId],
  )
  for (const l of logs) {
    parts.push(`WorkLog [${l.status}]: ${l.object}`)
    sources.push('work_logs')
  }

  parts.push('=== End Context — cite sources when answering ===')
  return { text: parts.join('\n'), sources: [...new Set(sources)] }
}
