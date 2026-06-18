import { queryAll } from './db'
import { buildOrgContext } from './rag-context'
import { ChatScope } from './ai-agents'
import { canViewTier } from './encryption'

export async function getUserMemories(companyId: string, userId: string, limit = 20) {
  return queryAll(
    `SELECT memory_key, content, created_at FROM user_ai_memory
     WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT $3`,
    [companyId, userId, limit],
  )
}

export async function saveUserMemory(companyId: string, userId: string, content: string, key = 'note') {
  const { run, newId } = await import('./db')
  await run(
    `INSERT INTO user_ai_memory (id, company_id, user_id, memory_key, content, source)
     VALUES ($1,$2,$3,$4,$5,'chat')`,
    [newId(), companyId, userId, key, content.slice(0, 2000)],
  )
}

export async function buildPersonalContext(companyId: string, userId: string, userName: string, role: string) {
  const sources: string[] = []
  const parts: string[] = [`=== ข้อมูลส่วนตัวของ ${userName} ===`]

  const tasks = await queryAll(
    `SELECT title, reason, due_date, done FROM daily_ai_tasks
     WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 10`,
    [companyId, userId],
  )
  for (const t of tasks) {
    parts.push(`Task [${t.done ? 'done' : 'open'}]: ${t.title}${t.due_date ? ` due ${t.due_date}` : ''} — ${t.reason || ''}`)
    sources.push('daily_tasks')
  }

  const kpis = await queryAll(
    `SELECT metric_name, metric_key, value, period FROM kpi_entries
     WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 10`,
    [companyId, userId],
  )
  for (const k of kpis) {
    parts.push(`KPI ${k.metric_name || k.metric_key}: ${k.value} (${k.period})`)
    sources.push('kpi')
  }

  const skills = await queryAll(
    `SELECT skill_name, score FROM skill_scores WHERE company_id = $1 AND user_id = $2 ORDER BY score DESC LIMIT 8`,
    [companyId, userId],
  )
  for (const s of skills) {
    parts.push(`Skill ${s.skill_name}: ${s.score}`)
    sources.push('skills')
  }

  const logs = await queryAll(
    `SELECT object, status, action_type, created_at FROM work_logs
     WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 8`,
    [companyId, userId],
  )
  for (const l of logs) {
    parts.push(`WorkLog [${l.status}] ${l.action_type}: ${l.object}`)
    sources.push('work_logs')
  }

  const memories = await getUserMemories(companyId, userId, 12)
  for (const m of memories) {
    parts.push(`Memory [${m.memory_key}]: ${m.content}`)
    sources.push('user_memory')
  }

  const files = await queryAll(
    `SELECT name, mime_type FROM user_files WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 5`,
    [companyId, userId],
  )
  for (const f of files) {
    parts.push(`File: ${f.name} (${f.mime_type})`)
    sources.push('user_files')
  }

  parts.push('=== End Personal Context ===')
  return { text: parts.join('\n'), sources: [...new Set(sources)] }
}

export async function buildDepartmentContext(companyId: string, department: string, viewerRole: string) {
  const sources: string[] = []
  const parts: string[] = [`=== แผนก ${department} ===`]

  const members = await queryAll(
    `SELECT name, role FROM users WHERE company_id = $1 AND department = $2 AND status = 'active'`,
    [companyId, department],
  )
  parts.push(`สมาชิก (${members.length}): ${members.map((m: any) => `${m.name}[${m.role}]`).join(', ')}`)
  sources.push('dept_users')

  const pending = await queryAll(
    `SELECT wl.object, wl.status, u.name FROM work_logs wl
     JOIN users u ON u.id = wl.user_id
     WHERE wl.company_id = $1 AND wl.department = $2 AND wl.status IN ('review','pending')
     ORDER BY wl.created_at DESC LIMIT 10`,
    [companyId, department],
  )
  for (const p of pending) {
    parts.push(`รอตรวจ: ${p.name} — ${p.object} [${p.status}]`)
    sources.push('dept_work_logs')
  }

  if (canViewTier(viewerRole, 'T2')) {
    const skills = await queryAll(
      `SELECT u.name, ss.skill_name, ss.score FROM skill_scores ss
       JOIN users u ON u.id = ss.user_id
       WHERE ss.company_id = $1 AND u.department = $2
       ORDER BY ss.score DESC LIMIT 15`,
      [companyId, department],
    )
    for (const s of skills) {
      parts.push(`Skill ${s.name} · ${s.skill_name}: ${s.score}`)
      sources.push('dept_skills')
    }
  }

  const knowledge = await queryAll(
    `SELECT title, content FROM knowledge_items ki
     JOIN users u ON u.id = ki.user_id
     WHERE ki.company_id = $1 AND u.department = $2 ORDER BY ki.created_at DESC LIMIT 5`,
    [companyId, department],
  )
  for (const k of knowledge) {
    parts.push(`SOP: ${k.title} — ${String(k.content).slice(0, 150)}`)
    sources.push('dept_sop')
  }

  parts.push('=== End Department Context ===')
  return { text: parts.join('\n'), sources: [...new Set(sources)] }
}

export async function buildScopedContext(
  scope: ChatScope,
  companyId: string,
  user: { id: string; name?: string; role?: string; department?: string },
): Promise<{ text: string; sources: string[] }> {
  if (scope === 'personal') {
    return buildPersonalContext(companyId, user.id, user.name || 'User', user.role || 'staff')
  }
  if (scope === 'department') {
    return buildDepartmentContext(companyId, user.department || 'Operation', user.role || 'staff')
  }
  return buildOrgContext(companyId, user.role || 'admin')
}
