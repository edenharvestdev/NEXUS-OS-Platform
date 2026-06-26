import crypto from 'crypto'
import { run, newId } from './db'
import { getRequestContext } from './request-context'

export type AiQueryLogInput = {
  provider?: string
  model?: string
  taskType?: string
  securityLevel?: string
  redactionMode: string
  redactionCount: number
  redactionHits?: Record<string, number>
  restrictedAttempt: boolean
  blocked: boolean
  promptChars: number
  promptHash: string
  responseSummary?: string
}

export function promptHash(s: string): string {
  return crypto.createHash('sha256').update(s || '').digest('hex')
}

/** Best-effort insert into ai_query_logs (never throws — must not break AI). */
export async function logAiQuery(input: AiQueryLogInput): Promise<void> {
  try {
    const ctx = getRequestContext()
    await run(
      `INSERT INTO ai_query_logs (
        ai_query_id, company_id, user_id, request_id, provider, model_used, task_type,
        security_level, redaction_mode, redaction_count, redaction_hits_json,
        restricted_attempt, blocked, prompt_hash, prompt_chars, response_summary, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        newId(), ctx.companyId || null, ctx.actorUserId || null, ctx.requestId || null,
        input.provider || null, input.model || null, input.taskType || null,
        input.securityLevel || null, input.redactionMode, input.redactionCount,
        input.redactionHits ? JSON.stringify(input.redactionHits) : null,
        input.restrictedAttempt ? 1 : 0, input.blocked ? 1 : 0,
        input.promptHash, input.promptChars, input.responseSummary || null,
        new Date().toISOString(),
      ],
    )
  } catch (e) {
    console.error('[ai_query_log] write failed (non-fatal):', (e as Error)?.message)
  }
}
