import crypto from 'crypto'
import { run, queryOne, newId } from './db'
import { getRequestContext } from './request-context'
import { isFlagOn } from './feature-flags'

export type AuditOpts = {
  companyId?: string
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  securityTier?: string
  /** meta may carry: before, after, changedFields, result, failureReason. */
  meta?: Record<string, unknown>
}

/** Number of audit writes that have failed since boot — surfaced on /health/deep
 *  so a silently-broken audit pipeline is visible instead of invisible. */
export let auditWriteFailures = 0

// ── Legacy best-effort table (audit_log, singular) ───────────────────
async function insertLegacy(opts: AuditOpts): Promise<void> {
  await run(
    `INSERT INTO audit_log (id, company_id, user_id, action, resource, resource_id, security_tier, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      newId(),
      opts.companyId || null,
      opts.userId || null,
      opts.action,
      opts.resource || null,
      opts.resourceId || null,
      opts.securityTier || 'T1',
      JSON.stringify(opts.meta || {}),
    ],
  )
}

// ── P1 append-only audit_logs (v2) — flag-gated, dark by default ─────
/** Dual-write to audit_logs only when enabled (per-company flag or AUDIT_V2=on).
 *  Default OFF → behavior identical to before this change. */
async function auditV2Enabled(companyId?: string): Promise<boolean> {
  if (process.env.AUDIT_V2 === 'on') return true
  return isFlagOn(companyId, 'p1.audit_v2')
}

function str(v: unknown): string | null {
  return v === undefined || v === null ? null : (typeof v === 'string' ? v : JSON.stringify(v))
}

async function insertV2(opts: AuditOpts): Promise<void> {
  const ctx = getRequestContext()
  const companyId = opts.companyId || ctx.companyId || null
  const meta = opts.meta || {}
  const createdAt = new Date().toISOString()
  const id = newId()

  // Per-company hash chain (best-effort ordering by created_at). Concurrency
  // hardening via pg_advisory_xact_lock is a TODO for the enforce phase; in the
  // dark/flag-off phase a rare interleave only weakens tamper-evidence, never
  // request behavior.
  const prev = companyId
    ? await queryOne(
        `SELECT row_hash FROM audit_logs WHERE company_id = $1 ORDER BY created_at DESC, audit_log_id DESC LIMIT 1`,
        [companyId],
      )
    : null
  const prevHash: string = prev?.row_hash || ''
  const core = JSON.stringify({
    id, companyId, action: opts.action, table: opts.resource, targetId: opts.resourceId,
    actor: ctx.actorUserId || opts.userId || null, ts: createdAt,
  })
  const rowHash = crypto.createHash('sha256').update(`${prevHash}|${core}`).digest('hex')

  await run(
    `INSERT INTO audit_logs (
      audit_log_id, company_id, actor_user_id, actor_employee_id, actor_role,
      action_type, target_table, target_id, target_security_level,
      before_value_json, after_value_json, changed_fields_json,
      ip_address, device, user_agent, request_id, session_id,
      api_endpoint, http_method, result_status, failure_reason,
      prev_hash, row_hash, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
    [
      id, companyId, ctx.actorUserId || opts.userId || null, ctx.actorEmployeeId || null, ctx.actorRole || null,
      opts.action, opts.resource || null, opts.resourceId || null, opts.securityTier || 'T1',
      str(meta.before), str(meta.after), str(meta.changedFields),
      ctx.ip || null, ctx.device || null, ctx.userAgent || null, ctx.requestId || null, ctx.sessionId || null,
      ctx.endpoint || null, ctx.method || null, (meta.result as string) || 'success', (meta.failureReason as string) || null,
      prevHash || null, rowHash, createdAt,
    ],
  )
}

/**
 * Best-effort audit write — never throws (availability over completeness for
 * routine actions). Failures are counted + logged (no longer silently swallowed)
 * so a broken pipeline is detectable.
 */
export async function writeAudit(opts: AuditOpts): Promise<void> {
  try {
    await insertLegacy(opts)
    if (await auditV2Enabled(opts.companyId)) await insertV2(opts)
  } catch (e) {
    auditWriteFailures++
    console.error('[audit] write failed (non-fatal):', (e as Error)?.message)
  }
}

/**
 * Strict audit write — THROWS on failure. Use for security-critical events that
 * must not be silently dropped (permission/role changes, break-glass, RESTRICTED
 * access, exports). The caller decides whether to fail the action if the audit
 * cannot be recorded.
 */
export async function writeAuditStrict(opts: AuditOpts): Promise<void> {
  await insertLegacy(opts)
  if (await auditV2Enabled(opts.companyId)) await insertV2(opts)
}
