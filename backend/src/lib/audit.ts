import { run, newId } from './db'

export async function writeAudit(opts: {
  companyId?: string
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  securityTier?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  try {
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
  } catch { /* non-fatal */ }
}
