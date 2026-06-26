/**
 * AIEG-2 — AI Gateway broker. The data-class DECISION layer on top of the AIEG-1
 * content-redaction floor (ai-redaction.ts) and egress log (ai-query-log.ts).
 * It classifies what is about to leave to an EXTERNAL AI provider and decides
 * whether RESTRICTED data (PHI / salary / payroll / IDs) may go.
 *
 * SHADOW by default: a restricted egress without consent is recorded (the
 * ai_query_logs row carries security_level=RESTRICTED + restricted_attempt) but
 * still SENT (redacted) — no behavior change. It is actually BLOCKED only when
 * AI_BROKER_ENFORCE=on. An explicit per-call `consent` bypasses the block (the
 * consent gate). Audit_log gets an event ONLY on an actual enforce-block (real
 * security event) — shadow would-blocks live in the high-volume ai_query_logs,
 * not the audit trail, to avoid flooding it.
 */
import { writeAudit } from './audit'
import { getRequestContext } from './request-context'

export type BrokerInput = {
  dataClass?: string        // explicit class from the caller (overrides inference)
  sensitiveCount?: number   // # of tokens the AIEG-1 redactor masked (>0 ⇒ sensitive content)
  consent?: boolean         // explicit per-call consent to send restricted data
  taskType?: string
}
export type BrokerDecision = {
  dataClass: string
  restricted: boolean
  wouldBlock: boolean       // restricted egress without consent (the shadow signal)
  block: boolean            // wouldBlock AND AI_BROKER_ENFORCE=on
  reason?: string
}

// Task hints that imply restricted business data is in play.
const RESTRICTED_TASKS = ['payroll', 'salary', 'medical', 'patient', 'hr', 'finance']

export function brokerEnforce(): boolean {
  return process.env.AI_BROKER_ENFORCE === 'on'
}

/** Classify the egress data class. Explicit `dataClass` wins; else infer from the
 *  task type, else from the AIEG-1 redactor's sensitive-token count. */
export function classifyEgress(input: BrokerInput): string {
  const explicit = (input.dataClass || '').toUpperCase()
  if (explicit) return explicit
  const task = (input.taskType || '').toLowerCase()
  if (task && RESTRICTED_TASKS.some((t) => task.includes(t))) return 'RESTRICTED'
  if ((input.sensitiveCount || 0) > 0) return 'RESTRICTED' // content carries IDs/salary/etc.
  return 'MEDIUM'
}

export function brokerEgress(input: BrokerInput): BrokerDecision {
  const dataClass = classifyEgress(input)
  const restricted = dataClass === 'RESTRICTED'
  const wouldBlock = restricted && !input.consent
  return {
    dataClass, restricted, wouldBlock,
    block: wouldBlock && brokerEnforce(),
    reason: wouldBlock ? 'restricted_egress_no_consent' : undefined,
  }
}

/** Audit ONLY an actual enforce-block (a real denied egress). Shadow would-blocks
 *  are recorded in ai_query_logs, not here, to keep the audit trail un-flooded. */
export function auditEgressBlocked(d: BrokerDecision, meta: Record<string, unknown> = {}): void {
  if (!d.block) return
  const ctx = getRequestContext()
  void writeAudit({
    companyId: ctx.companyId, userId: ctx.actorUserId,
    action: 'ai_egress.blocked', resource: 'ai_provider', securityTier: 'T2',
    meta: { data_class: d.dataClass, reason: d.reason, ...meta },
  }).catch(() => { /* best-effort */ })
}
