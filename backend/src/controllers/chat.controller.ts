import { Request, Response } from 'express'
import {
  ChatScope,
  AI_AGENTS,
  resolveSessionId,
  canUseScope,
  buildSystemPrompt,
  agentDutiesText,
  taskTypeForScope,
} from '../lib/ai-agents'
import { buildScopedContext, saveUserMemory } from '../lib/ai-context'
import { routeAI } from '../lib/ai-router'
import { anyAIConfigured } from '../lib/ai-providers'
import { queryAll, run, newId } from '../lib/db'

function parseScope(raw: unknown): ChatScope {
  if (raw === 'personal' || raw === 'department' || raw === 'company') return raw
  return 'personal'
}

function historyFilter(scope: ChatScope, user: any, sessionId: string) {
  if (scope === 'personal') {
    return {
      sql: `SELECT role, content FROM chat_messages
            WHERE company_id = $1 AND session_id = $2 AND user_id = $3
            ORDER BY created_at DESC LIMIT 12`,
      params: [user.company_id, sessionId, user.id],
    }
  }
  if (scope === 'department') {
    return {
      sql: `SELECT role, content FROM chat_messages
            WHERE company_id = $1 AND session_id = $2
            ORDER BY created_at DESC LIMIT 12`,
      params: [user.company_id, sessionId],
    }
  }
  return {
    sql: `SELECT role, content FROM chat_messages
          WHERE company_id = $1 AND session_id = $2
          ORDER BY created_at DESC LIMIT 12`,
    params: [user.company_id, sessionId],
  }
}

async function askScopedAI(
  scope: ChatScope,
  prompt: string,
  user: { company_id: string; id: string; role: string },
): Promise<{ text: string; provider: string; model: string; decision_rights: string }> {
  const hasAnyKey = anyAIConfigured()
  if (!hasAnyKey) {
    if (process.env.NODE_ENV === 'production') throw new Error('AI API keys not configured')
    return {
      text: 'สวัสดีครับ! ตั้ง OPENAI_API_KEY หรือ GEMINI_API_KEY ใน nexus-api เพื่อใช้ AI จริง',
      provider: 'none',
      model: 'demo',
      decision_rights: 'auto',
    }
  }

  const taskType = taskTypeForScope(scope)
  const routed = await routeAI(prompt, taskType, {
    companyId: user.company_id,
    userId: user.id,
    userRole: user.role,
    grounded: true,
  })
  return {
    text: routed.response,
    provider: routed.provider,
    model: routed.model,
    decision_rights: routed.decision_rights,
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const scope = parseScope(req.body.scope)
  const { message } = req.body
  if (!message?.trim()) { res.status(400).json({ error: 'message is required' }); return }
  if (!canUseScope(scope, req.user.role)) {
    res.status(403).json({ error: 'ไม่มีสิทธิ์ใช้ AI ระดับนี้' })
    return
  }

  const sessionId = resolveSessionId(scope, req.user)
  const { company_id, id: user_id, role, name, department, companies } = req.user

  await run(
    `INSERT INTO chat_messages (id, company_id, user_id, session_id, role, content, chat_scope, department)
     VALUES ($1,$2,$3,$4,'user',$5,$6,$7)`,
    [newId(), company_id, user_id, sessionId, message.trim(), scope, department || null],
  )

  const hf = historyFilter(scope, req.user, sessionId)
  const history = await queryAll(hf.sql, hf.params)
  const historyText = history.reverse().map((m: any) => `${m.role === 'user' ? 'ผู้ใช้' : 'AI'}: ${m.content}`).join('\n')

  const rag = await buildScopedContext(scope, company_id, req.user)
  const companyName = companies?.name || 'องค์กร'
  const prompt = `${buildSystemPrompt(scope, {
    userName: name || 'User',
    department,
    companyName,
    agentDuties: agentDutiesText(scope),
    contextBlock: `${rag.text}\n\nsources: ${rag.sources.join(', ')}\n\nประวัติ:\n${historyText}\n\nคำถาม: ${message}`,
  })}`

  const agentName = scope === 'personal' ? 'Personal AI' : scope === 'department' ? 'Department AI' : 'CEO AI'

  let aiResult: Awaited<ReturnType<typeof askScopedAI>>
  try {
    aiResult = await askScopedAI(scope, prompt, req.user)
  } catch (e: any) {
    res.status(503).json({ error: e.message })
    return
  }

  await run(
    `INSERT INTO chat_messages (id, company_id, user_id, session_id, role, content, chat_scope, department)
     VALUES ($1,$2,$3,$4,'ai',$5,$6,$7)`,
    [newId(), company_id, user_id, sessionId, aiResult.text, scope, department || null],
  )

  if (scope === 'personal' && message.length > 20) {
    await saveUserMemory(company_id, user_id, `ผู้ใช้: ${message.slice(0, 500)}`, 'chat')
  }

  const estimatedTokens = Math.ceil((prompt.length + aiResult.text.length) / 3.5)
  await run(
    `INSERT INTO ai_logs (id, company_id, user_id, agent, action, tokens_used, cost_thb)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [newId(), company_id, user_id, `${agentName}:${aiResult.provider}`, message.slice(0, 80), estimatedTokens, parseFloat((estimatedTokens * 0.0002).toFixed(4))],
  )

  res.json({
    text: aiResult.text,
    sources: rag.sources,
    scope,
    agent: AI_AGENTS[scope],
    provider: aiResult.provider,
    model: aiResult.model,
    decision_rights: aiResult.decision_rights,
    task_type: taskTypeForScope(scope),
  })
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const scope = parseScope(req.query.scope)
  if (!canUseScope(scope, req.user.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const sessionId = resolveSessionId(scope, req.user)
  const limit = parseInt(String(req.query.limit || '50'), 10) || 50

  let sql = `SELECT * FROM chat_messages WHERE company_id = $1 AND session_id = $2`
  const params: any[] = [req.user.company_id, sessionId]
  if (scope === 'personal') {
    sql += ' AND user_id = $3'
    params.push(req.user.id)
  }
  sql += ' ORDER BY created_at ASC LIMIT $' + (params.length + 1)
  params.push(limit)

  const data = await queryAll(sql, params)
  res.json({ data, scope, agent: AI_AGENTS[scope], task_type: taskTypeForScope(scope) })
}

export async function clearHistory(req: Request, res: Response): Promise<void> {
  const scope = parseScope(req.query.scope)
  if (!canUseScope(scope, req.user.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const sessionId = resolveSessionId(scope, req.user)
  if (scope === 'personal') {
    await run(
      'DELETE FROM chat_messages WHERE company_id = $1 AND session_id = $2 AND user_id = $3',
      [req.user.company_id, sessionId, req.user.id],
    )
  } else {
    await run(
      'DELETE FROM chat_messages WHERE company_id = $1 AND session_id = $2',
      [req.user.company_id, sessionId],
    )
  }
  res.json({ success: true })
}

export async function listAgents(_req: Request, res: Response): Promise<void> {
  const scopes = (['personal', 'department', 'company'] as ChatScope[]).map(scope => ({
    scope,
    agent: AI_AGENTS[scope],
    task_type: taskTypeForScope(scope),
  }))
  res.json({ agents: AI_AGENTS, scopes })
}
