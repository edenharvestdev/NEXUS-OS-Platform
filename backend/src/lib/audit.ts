import { run, newId } from './db'

export type AuditOpts = {
  companyId?: string
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  securityTier?: string
  meta?: Record<string, unknown>
}

/** Number of audit writes that have failed since boot — surfaced on /health/deep
 *  so a silently-broken audit pipeline is visible instead of invisible. */
export let auditWriteFailures = 0

async function insertAudit(opts: AuditOpts): Promise<void> {
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

/**
 * Best-effort audit write — never throws (availability over completeness for
 * routine actions). Failures are counted + logged (no longer silently swallowed)
 * so a broken pipeline is detectable.
 */
export async function writeAudit(opts: AuditOpts): Promise<void> {
  try {
    await insertAudit(opts)
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
  await insertAudit(opts)
}
