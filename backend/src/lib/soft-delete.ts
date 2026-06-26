/**
 * Soft Delete v1 — DARK. A reusable core that marks rows deleted instead of
 * removing them, with role-based + MANDATORY tenant-scoped authorization tied to
 * Role Hierarchy v1, full audit, and restore. There is NO hard delete here
 * (purge is a later phase). Existing hard-delete endpoints are NOT rewired by
 * this module — soft delete is opt-in via the new endpoints until the rollout.
 *
 * Authorization model:
 *   - delete   → per-resource manager/owner roles (registry.deleteRoles)
 *   - restore  → owner/admin ONLY (higher bar; un-deleting is sensitive)
 *   - view deleted → owner/admin (own tenant) + platform_superadmin (cross-tenant,
 *     VIEW ONLY — never delete/restore across tenants)
 *   - staff / managers → never see deleted rows (visibility filter)
 *
 * Tenant safety: delete AND restore are ALWAYS bound to the actor's company; a
 * mismatch is masked as not_found. Only platform_superadmin's LIST may cross
 * tenants, and it can never mutate.
 */
import { queryOne, queryAll, run } from './db'
import { writeAuditStrict, writeAudit } from './audit'

export type SoftDeleteActor = { id: string; role?: string; companyId?: string }

/** Best-effort audit for non-mutating / denied events (reads + failed attempts
 *  must not fail the request, so writeAudit not writeAuditStrict). */
function auditDenied(actor: SoftDeleteActor, op: string, resource: string, id: string, reason: string): void {
  void writeAudit({
    companyId: actor.companyId, userId: actor.id, action: 'softdelete.denied', resource, resourceId: id,
    securityTier: 'T1', meta: { op, reason, role: actor.role },
  }).catch(() => { /* best-effort */ })
}
export type SoftDeleteResult = { ok: boolean; reason?: string; resource?: string; id?: string }

type ResourceDef = {
  table: string
  /** roles allowed to soft-delete this resource (besides being same-tenant). */
  deleteRoles: string[]
  /** T2 = business data; T3 = sensitive (none in v1 set, kept for future). */
  tier: 'T2' | 'T3'
}

export const RESTORE_ROLES = ['owner', 'admin']         // high bar — un-delete
export const VIEW_DELETED_ROLES = ['owner', 'admin']    // own-tenant deleted view
export const PLATFORM_VIEW_ROLE = 'platform_superadmin' // cross-tenant VIEW only

/** v1 registry — only fully-covered resources are registered (every read site of
 *  each has a deleted_at IS NULL filter). */
export const SOFT_DELETE_RESOURCES: Record<string, ResourceDef> = {
  documents: { table: 'documents', deleteRoles: ['owner', 'admin', 'ceo', 'it', 'hr', 'operations'], tier: 'T2' },
  deals:     { table: 'deals', deleteRoles: ['owner', 'admin', 'ceo', 'sales'], tier: 'T2' },
  campaigns: { table: 'campaigns', deleteRoles: ['owner', 'admin', 'ceo', 'marketing'], tier: 'T2' },
}

function norm(role?: string): string { return (role || 'staff').toLowerCase() }
function nowIso(): string { return new Date().toISOString() }
function def(resource: string): ResourceDef | null { return SOFT_DELETE_RESOURCES[resource] || null }

/** Dark by default. When off, existing delete endpoints keep hard-deleting (no
 *  behavior change); when on (`SOFT_DELETE=on`), they route through softDelete().
 *  Same env-flag pattern as AUTHZ_SHADOW / STEP_UP_ENFORCE. */
export function softDeleteEnabled(): boolean {
  return process.env.SOFT_DELETE === 'on'
}

/** Map a SoftDeleteResult.reason to an HTTP status (shared by all callers). */
export function softDeleteHttpStatus(reason?: string): number {
  const m: Record<string, number> = {
    unknown_resource: 404, not_found: 404, not_authorized: 403, already_deleted: 409, not_deleted: 409,
  }
  return m[reason || ''] || 400
}

/** SQL fragment to hide soft-deleted rows. Use in every read of a registered
 *  resource. Pass the table alias if the query uses one. */
export function notDeleted(alias?: string): string {
  return `${alias ? alias + '.' : ''}deleted_at IS NULL`
}

export function isSoftDeletable(resource: string): boolean { return !!def(resource) }
export function canRestore(role?: string): boolean { return RESTORE_ROLES.includes(norm(role)) }
export function canViewDeleted(role?: string): boolean {
  const r = norm(role)
  return VIEW_DELETED_ROLES.includes(r) || r === PLATFORM_VIEW_ROLE
}

/** Soft-delete a row. Tenant-bound; role-gated; audited. */
export async function softDelete(resource: string, id: string, actor: SoftDeleteActor, opts: { reason?: string; source?: 'user' | 'system' } = {}): Promise<SoftDeleteResult> {
  const d = def(resource)
  if (!d) return { ok: false, reason: 'unknown_resource' }
  const row = await queryOne(`SELECT id, company_id, deleted_at FROM ${d.table} WHERE id = $1`, [id])
  if (!row) return { ok: false, reason: 'not_found' }
  if (!actor.companyId || row.company_id !== actor.companyId) { auditDenied(actor, 'delete', d.table, id, 'tenant_mismatch'); return { ok: false, reason: 'not_found' } }
  if (!d.deleteRoles.includes(norm(actor.role))) { auditDenied(actor, 'delete', d.table, id, 'not_authorized'); return { ok: false, reason: 'not_authorized' } }
  if (row.deleted_at) return { ok: false, reason: 'already_deleted' }

  const ts = nowIso()
  const source = opts.source === 'system' ? 'system' : 'user'
  await run(
    `UPDATE ${d.table} SET deleted_at=$1, deleted_by=$2, delete_reason=$3, delete_source=$4 WHERE id=$5 AND company_id=$6 AND deleted_at IS NULL`,
    [ts, actor.id, opts.reason || null, source, id, actor.companyId],
  )
  // Audit MUST accompany the mutation. No cross-DB transaction helper exists, so
  // if the (strict) audit write fails we revert the mutation and rethrow — the
  // async-guard turns the throw into a 500. Net: never a mutation without audit.
  try {
    await writeAuditStrict({
      companyId: actor.companyId, userId: actor.id, action: 'softdelete.delete', resource: d.table, resourceId: id,
      securityTier: d.tier, meta: { reason: opts.reason || null, source },
    })
  } catch (e) {
    await run(`UPDATE ${d.table} SET deleted_at=NULL, deleted_by=NULL, delete_reason=NULL, delete_source=NULL WHERE id=$1 AND company_id=$2`, [id, actor.companyId]).catch(() => {})
    throw e
  }
  return { ok: true, resource, id }
}

/** Restore a soft-deleted row. owner/admin only; tenant-bound; audited. */
export async function restore(resource: string, id: string, actor: SoftDeleteActor, opts: { reason?: string } = {}): Promise<SoftDeleteResult> {
  const d = def(resource)
  if (!d) return { ok: false, reason: 'unknown_resource' }
  const row = await queryOne(`SELECT id, company_id, deleted_at FROM ${d.table} WHERE id = $1`, [id])
  if (!row) return { ok: false, reason: 'not_found' }
  if (!actor.companyId || row.company_id !== actor.companyId) { auditDenied(actor, 'restore', d.table, id, 'tenant_mismatch'); return { ok: false, reason: 'not_found' } }
  if (!canRestore(actor.role)) { auditDenied(actor, 'restore', d.table, id, 'not_authorized'); return { ok: false, reason: 'not_authorized' } }
  if (!row.deleted_at) return { ok: false, reason: 'not_deleted' }

  const ts = nowIso()
  const prevDeletedAt = row.deleted_at // for revert if the audit write fails
  await run(
    `UPDATE ${d.table} SET deleted_at=NULL, restored_at=$1, restored_by=$2, restore_reason=$3 WHERE id=$4 AND company_id=$5 AND deleted_at IS NOT NULL`,
    [ts, actor.id, opts.reason || null, id, actor.companyId],
  )
  // Atomicity: revert to the deleted state if the strict audit write fails.
  try {
    await writeAuditStrict({
      companyId: actor.companyId, userId: actor.id, action: 'softdelete.restore', resource: d.table, resourceId: id,
      securityTier: d.tier, meta: { reason: opts.reason || null },
    })
  } catch (e) {
    await run(`UPDATE ${d.table} SET deleted_at=$1, restored_at=NULL, restored_by=NULL, restore_reason=NULL WHERE id=$2 AND company_id=$3`, [prevDeletedAt, id, actor.companyId]).catch(() => {})
    throw e
  }
  return { ok: true, resource, id }
}

/** List soft-deleted rows. owner/admin → own tenant; platform_superadmin →
 *  cross-tenant (VIEW only). Anyone else → not_authorized. */
export async function listDeleted(resource: string, actor: SoftDeleteActor, opts: { limit?: number } = {}): Promise<{ ok: boolean; reason?: string; rows?: any[] }> {
  const d = def(resource)
  if (!d) return { ok: false, reason: 'unknown_resource' }
  if (!canViewDeleted(actor.role)) { auditDenied(actor, 'list', d.table, '', 'not_authorized'); return { ok: false, reason: 'not_authorized' } }
  const limit = Math.min(opts.limit || 100, 500)
  const isPlatform = norm(actor.role) === PLATFORM_VIEW_ROLE

  let rows: any[]
  if (isPlatform) {
    rows = await queryAll(`SELECT * FROM ${d.table} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT $1`, [limit])
  } else {
    if (!actor.companyId) return { ok: false, reason: 'not_authorized' }
    rows = await queryAll(`SELECT * FROM ${d.table} WHERE company_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT $2`, [actor.companyId, limit])
  }
  // Best-effort audit of the (sensitive) deleted-data view — esp. platform cross-tenant.
  void writeAudit({
    companyId: actor.companyId, userId: actor.id, action: 'softdelete.list_deleted', resource: d.table,
    securityTier: 'T1', meta: { cross_tenant: isPlatform, count: rows.length },
  }).catch(() => { /* best-effort */ })
  return { ok: true, rows }
}
