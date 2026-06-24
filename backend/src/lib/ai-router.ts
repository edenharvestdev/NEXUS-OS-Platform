/**
 * NEXUS OS AI Connector — Model Router (L2 + AI Layer)
 * Primary route per task type + automatic multi-provider fallback.
 */
import { askWithFallback, hasProvider, type AIProvider } from './ai-providers'
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

const ROUTES: Record<AITaskType, {
  provider: string
  model: string
  decision_rights: RouteResult['decision_rights']
  prefer: AIProvider[]
}> = {
  strategy:    { provider: 'claude',  model: 'claude-sonnet',              decision_rights: 'suggest', prefer: ['claude', 'openai', 'gemini'] },
  automation:  { provider: 'openai',  model: 'gpt-4o',                     decision_rights: 'suggest', prefer: ['openai', 'claude', 'gemini'] },
  research:    { provider: 'openai',  model: 'gpt-4o',                     decision_rights: 'auto',    prefer: ['openai', 'gemini', 'claude'] },
  thai_market: { provider: 'typhoon', model: 'typhoon-v2.5-30b-a3b-instruct', decision_rights: 'auto', prefer: ['typhoon', 'openai', 'gemini'] },
  general:     { provider: 'openai',  model: 'gpt-4o',                     decision_rights: 'auto',    prefer: ['openai', 'gemini', 'claude', 'typhoon'] },
}

export function resolveTaskType(input?: string): AITaskType {
  const t = (input || 'general').toLowerCase()
  if (['strategy', 'analysis', 'ceo', 'refactor'].includes(t)) return 'strategy'
  if (['automation', 'system', 'function', 'code'].includes(t)) return 'automation'
  if (['research', 'long_context', 'document'].includes(t)) return 'research'
  if (['thai', 'thai_market', 'statistics', 'market'].includes(t)) return 'thai_market'
  return 'general'
}

export async function routeAI(
  prompt: string,
  taskTypeInput?: string,
  options?: { system?: string; companyId?: string; userId?: string; userRole?: string; grounded?: boolean },
): Promise<RouteResult> {
  const taskType = resolveTaskType(taskTypeInput)
  const route = ROUTES[taskType]
  const decisionRights = await resolveDecisionRights(taskType, options?.companyId)

  let contextBlock = ''
  if (options?.grounded && options?.companyId) {
    const rag = await buildOrgContext(options.companyId, options.userRole || 'staff', options.userId)
    contextBlock = rag.text + '\n'
  }

  const fullPrompt = contextBlock + prompt
  const result = await askWithFallback(fullPrompt, {
    system: options?.system,
    prefer: route.prefer,
  })

  if (options?.companyId) {
    try {
      await run(
        `INSERT INTO ai_logs (id, company_id, user_id, agent, action, tokens_used, cost_thb, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'success')`,
        [newId(), options.companyId, options.userId || null, `Router:${result.provider}`, taskType, Math.ceil(prompt.length / 4), 0.5],
      )
    } catch { /* non-fatal */ }
  }

  return {
    provider: result.provider,
    model: result.model,
    task_type: taskType,
    response: result.text,
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
      configured: r.prefer.some(p => hasProvider(p)),
      fallback_chain: r.prefer.filter(p => hasProvider(p)),
    })),
    principle: 'Copilot not Autopilot',
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
