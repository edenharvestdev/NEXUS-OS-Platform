/**
 * NEXUS OS AI Connector — Model Router (L2 + AI Layer)
 * Routes by task type; falls back to Gemini when provider key missing.
 */
import { askGemini } from './gemini'
import { run, newId, queryOne } from './db'
import { buildOrgContext } from './rag-context'

export type AITaskType =
  | 'strategy'
  | 'automation'
  | 'research'
  | 'thai_market'
  | 'general'

export interface RouteResult {
  provider: string
  model: string
  task_type: AITaskType
  response: string
  decision_rights: 'auto' | 'suggest' | 'human'
  grounded: boolean
}

const ROUTES: Record<AITaskType, { provider: string; model: string; decision_rights: RouteResult['decision_rights'] }> = {
  strategy:    { provider: 'claude',   model: 'claude-sonnet-4-20250514', decision_rights: 'suggest' },
  automation:  { provider: 'openai',   model: 'gpt-4o',                   decision_rights: 'suggest' },
  research:    { provider: 'gemini',   model: 'gemini-2.0-flash',         decision_rights: 'auto' },
  thai_market: { provider: 'typhoon',  model: 'typhoon-v2',               decision_rights: 'auto' },
  general:     { provider: 'gemini',   model: 'gemini-2.0-flash',         decision_rights: 'auto' },
}

export function resolveTaskType(input?: string): AITaskType {
  const t = (input || 'general').toLowerCase()
  if (['strategy', 'analysis', 'ceo', 'refactor'].includes(t)) return 'strategy'
  if (['automation', 'system', 'function', 'code'].includes(t)) return 'automation'
  if (['research', 'long_context', 'document'].includes(t)) return 'research'
  if (['thai', 'thai_market', 'statistics', 'market'].includes(t)) return 'thai_market'
  return 'general'
}

async function askClaude(prompt: string, system?: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ROUTES.strategy.model,
      max_tokens: 2048,
      system: system || 'You are NEXUS OS AI — answer from organizational context. Copilot, not Autopilot.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data.error?.message || 'Claude API error')
  return data.content?.[0]?.text || ''
}

async function askOpenAI(prompt: string, system?: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ROUTES.automation.model,
      messages: [
        { role: 'system', content: system || 'You are NEXUS OS automation agent.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error')
  return data.choices?.[0]?.message?.content || ''
}

async function askTyphoon(prompt: string): Promise<string> {
  const key = process.env.TYPHOON_API_KEY
  if (key) {
    const base = process.env.TYPHOON_API_URL || 'https://api.opentyphoon.ai/v1/chat/completions'
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'typhoon-v2',
        messages: [
          { role: 'system', content: 'คุณคือ NEXUS OS Typhoon Agent — ตอบภาษาไทย เน้นข้อมูลตลาดไทย' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    const data = await res.json() as any
    if (res.ok) return data.choices?.[0]?.message?.content || data.message || ''
  }
  // Fallback: Gemini with Thai market framing
  return askGemini(`[Typhoon routing — Thai market context]\n${prompt}\nตอบภาษาไทย อ้างอิงบริบทไทย`)
}

export async function routeAI(
  prompt: string,
  taskTypeInput?: string,
  options?: { system?: string; companyId?: string; userId?: string; userRole?: string; grounded?: boolean },
): Promise<RouteResult> {
  const taskType = resolveTaskType(taskTypeInput)
  const route = ROUTES[taskType]
  const decisionRights = await resolveDecisionRights(taskType, options?.companyId)
  let response = ''
  let provider = route.provider
  let model = route.model

  let contextBlock = ''
  if (options?.grounded && options?.companyId) {
    const rag = await buildOrgContext(options.companyId, options.userRole || 'staff')
    contextBlock = rag.text + '\n'
  }

  const fullPrompt = contextBlock + prompt

  try {
    switch (route.provider) {
      case 'claude':
        response = await askClaude(fullPrompt, options?.system)
        break
      case 'openai':
        response = await askOpenAI(fullPrompt, options?.system)
        break
      case 'typhoon':
        response = await askTyphoon(fullPrompt)
        break
      default:
        response = await askGemini(fullPrompt)
        provider = 'gemini'
        model = 'gemini-2.0-flash'
    }
  } catch (err: any) {
    response = await askGemini(`[Fallback: ${err.message}]\n${fullPrompt}`)
    provider = 'gemini'
    model = 'gemini-2.0-flash (fallback)'
  }

  if (options?.companyId) {
    try {
      await run(
        `INSERT INTO ai_logs (id, company_id, user_id, agent, action, tokens_used, cost_thb, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'success')`,
        [newId(), options.companyId, options.userId || null, `Router:${provider}`, taskType, Math.ceil(prompt.length / 4), 0.5],
      )
    } catch { /* non-fatal */ }
  }

  return {
    provider,
    model,
    task_type: taskType,
    response,
    decision_rights: decisionRights,
    grounded: !!options?.grounded,
  }
}

export function getRouterStatus() {
  return {
    routes: Object.entries(ROUTES).map(([task, r]) => ({
      task_type: task,
      provider: r.provider,
      model: r.model,
      decision_rights: r.decision_rights,
      configured: isProviderConfigured(r.provider),
    })),
    principle: 'Copilot not Autopilot',
  }
}

function isProviderConfigured(provider: string): boolean {
  switch (provider) {
    case 'claude': return !!process.env.ANTHROPIC_API_KEY
    case 'openai': return !!process.env.OPENAI_API_KEY
    case 'typhoon': return !!process.env.TYPHOON_API_KEY || !!process.env.GEMINI_API_KEY
    case 'gemini': return !!process.env.GEMINI_API_KEY
    default: return false
  }
}

async function resolveDecisionRights(
  taskType: AITaskType,
  companyId?: string,
): Promise<RouteResult['decision_rights']> {
  const defaultRights = ROUTES[taskType].decision_rights
  if (!companyId) return defaultRights
  try {
    const company = await queryOne('SELECT settings FROM companies WHERE id = $1', [companyId])
    const settings = JSON.parse(String(company?.settings || '{}')) as { ai_decision_rights?: Record<string, string> }
    const custom = settings.ai_decision_rights?.[taskType]
    if (custom === 'auto' || custom === 'suggest' || custom === 'human') return custom
  } catch { /* use default */ }
  return defaultRights
}
