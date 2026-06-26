/**
 * BG-1 — break-glass for RESTRICTED data. SHADOW: grants are recorded and
 * queryable (hasActiveBreakGlass), but nothing enforces RESTRICTED yet, so a
 * grant changes no live decision. When AUTHZ least-privilege is enforced, the
 * data path will call hasActiveBreakGlass() and pass {breakGlass:true} to
 * resolveDataClass.
 *
 * Hybrid model: duration <= 15min self-service (active immediately) + alert;
 * > 15min requires a SECOND privileged approver (two-person). Every step is
 * writeAuditStrict (T3). A fresh step-up (MFA-1) is required to request.
 */
import { queryOne, queryAll, run, newId } from './db'
import { normalizeRole } from './rbac'
import { consumeStepUp } from './mfa'
import { writeAuditStrict } from './audit'
import { createNotification } from './notifications'

const SELF_SERVICE_MAX_MIN = 15  // <= this → self-service; above → approval
const MAX_DURATION_MIN = 480     // hard cap (8h)
const APPROVER_ROLES = ['ceo', 'admin', 'it'] // until ROLE-1 adds it_security/owner

function nowIso(): string { return new Date().toISOString() }
function plusMinutesIso(min: number): string { return new Date(Date.now() + min * 60_000).toISOString() }

export type BreakGlassResult = {
  ok: boolean
  reason?: string
  grantId?: string
  status?: string
  expiresAt?: string
}

async function notify(companyId: string | undefined, kind: string, meta: Record<string, unknown>): Promise<void> {
  if (!companyId) return
  const recipients = await queryAll(
    `SELECT id FROM users WHERE company_id = $1 AND role IN ('ceo','admin','it') AND status = 'active' LIMIT 10`,
    [companyId],
  ).catch(() => [])
  for (const r of recipients) {
    await createNotification({
      companyId, userId: r.id, type: 'break_glass',
      title: `🔓 Break-glass ${kind}`,
      body: String(meta.reason || ''),
      meta,
    }).catch(() => { /* in-app notify is best-effort */ })
  }
}

/** Request a break-glass grant. Requires a valid step-up token (X-Step-Up). */
export async function requestBreakGlass(p: {
  userId: string
  companyId?: string
  dataClass?: string
  scope?: string
  reason: string
  durationMin: number
  stepUpToken?: string
}): Promise<BreakGlassResult> {
  const dataClass = (p.dataClass || 'RESTRICTED').toUpperCase()
  const scope = p.scope || '*'
  const reason = (p.reason || '').trim()
  if (reason.length < 5) return { ok: false, reason: 'reason_required' }
  const durationMin = Math.max(1, Math.min(Math.floor(p.durationMin) || SELF_SERVICE_MAX_MIN, MAX_DURATION_MIN))

  // step-up gate (MFA-1). consumeStepUp BURNS the token (single-use) so one MFA
  // proof authorizes exactly one break-glass grant; its jti is recorded.
  const su = await consumeStepUp(p.stepUpToken || '', p.userId)
  if (!su.ok) return { ok: false, reason: 'step_up_required' }

  const id = newId()
  const created = nowIso()
  const requiresApproval = durationMin > SELF_SERVICE_MAX_MIN

  if (requiresApproval) {
    await run(
      `INSERT INTO break_glass_grants
         (id, company_id, user_id, data_class, scope, reason, duration_min, status, requires_approval, step_up_jti, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',1,$8,$9)`,
      [id, p.companyId || null, p.userId, dataClass, scope, reason, durationMin, su.jti || null, created],
    )
    await writeAuditStrict({
      companyId: p.companyId, userId: p.userId, action: 'breakglass.request', resource: 'break_glass_grants', resourceId: id,
      securityTier: 'T3', meta: { status: 'pending', data_class: dataClass, scope, duration_min: durationMin, reason },
    })
    await notify(p.companyId, 'approval needed', { grant_id: id, for_user: p.userId, data_class: dataClass, duration_min: durationMin, reason })
    return { ok: true, grantId: id, status: 'pending' }
  }

  const expiresAt = plusMinutesIso(durationMin)
  await run(
    `INSERT INTO break_glass_grants
       (id, company_id, user_id, data_class, scope, reason, duration_min, status, requires_approval, step_up_jti, created_at, activated_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'active',0,$8,$9,$10,$11)`,
    [id, p.companyId || null, p.userId, dataClass, scope, reason, durationMin, su.jti || null, created, created, expiresAt],
  )
  await writeAuditStrict({
    companyId: p.companyId, userId: p.userId, action: 'breakglass.activate', resource: 'break_glass_grants', resourceId: id,
    securityTier: 'T3', meta: { status: 'active', self_service: true, data_class: dataClass, scope, duration_min: durationMin, expires_at: expiresAt, reason },
  })
  await notify(p.companyId, 'activated (self-service)', { grant_id: id, for_user: p.userId, data_class: dataClass, expires_at: expiresAt, reason })
  return { ok: true, grantId: id, status: 'active', expiresAt }
}

/** Approve a pending (>15min) grant. Two-person: approver ≠ requester, must be privileged. */
export async function approveBreakGlass(grantId: string, approver: { id: string; role?: string; companyId?: string }): Promise<BreakGlassResult> {
  const g = await queryOne('SELECT * FROM break_glass_grants WHERE id = $1', [grantId])
  if (!g) return { ok: false, reason: 'not_found' }
  if (g.status !== 'pending') return { ok: false, reason: 'not_pending' }
  if (g.user_id === approver.id) return { ok: false, reason: 'self_approval_forbidden' }
  if (!APPROVER_ROLES.includes(normalizeRole(approver.role))) return { ok: false, reason: 'not_authorized' }

  const now = nowIso()
  const expiresAt = plusMinutesIso(g.duration_min)
  await run(
    `UPDATE break_glass_grants SET status='active', approved_by=$1, activated_at=$2, expires_at=$3, decided_at=$4, decided_by=$5 WHERE id=$6`,
    [approver.id, now, expiresAt, now, approver.id, grantId],
  )
  await writeAuditStrict({
    companyId: g.company_id, userId: approver.id, action: 'breakglass.approve', resource: 'break_glass_grants', resourceId: grantId,
    securityTier: 'T3', meta: { for_user: g.user_id, data_class: g.data_class, expires_at: expiresAt },
  })
  await notify(g.company_id, 'approved', { grant_id: grantId, for_user: g.user_id, approved_by: approver.id, expires_at: expiresAt })
  return { ok: true, status: 'active', expiresAt }
}

/** Deny a pending grant. */
export async function denyBreakGlass(grantId: string, approver: { id: string; role?: string }): Promise<BreakGlassResult> {
  const g = await queryOne('SELECT * FROM break_glass_grants WHERE id = $1', [grantId])
  if (!g) return { ok: false, reason: 'not_found' }
  if (g.status !== 'pending') return { ok: false, reason: 'not_pending' }
  if (!APPROVER_ROLES.includes(normalizeRole(approver.role))) return { ok: false, reason: 'not_authorized' }
  const now = nowIso()
  await run(`UPDATE break_glass_grants SET status='denied', decided_at=$1, decided_by=$2 WHERE id=$3`, [now, approver.id, grantId])
  await writeAuditStrict({
    companyId: g.company_id, userId: approver.id, action: 'breakglass.deny', resource: 'break_glass_grants', resourceId: grantId,
    securityTier: 'T3', meta: { for_user: g.user_id },
  })
  return { ok: true, status: 'denied' }
}

/** Revoke an active/pending grant early (requester themselves or a privileged user). */
export async function revokeBreakGlass(grantId: string, by: { id: string; role?: string }): Promise<BreakGlassResult> {
  const g = await queryOne('SELECT * FROM break_glass_grants WHERE id = $1', [grantId])
  if (!g) return { ok: false, reason: 'not_found' }
  if (g.status !== 'active' && g.status !== 'pending') return { ok: false, reason: 'not_revocable' }
  const isOwner = g.user_id === by.id
  if (!isOwner && !APPROVER_ROLES.includes(normalizeRole(by.role))) return { ok: false, reason: 'not_authorized' }
  const now = nowIso()
  await run(`UPDATE break_glass_grants SET status='revoked', decided_at=$1, decided_by=$2 WHERE id=$3`, [now, by.id, grantId])
  await writeAuditStrict({
    companyId: g.company_id, userId: by.id, action: 'breakglass.revoke', resource: 'break_glass_grants', resourceId: grantId,
    securityTier: 'T3', meta: { for_user: g.user_id },
  })
  return { ok: true, status: 'revoked' }
}

/** Does `userId` hold an ACTIVE, non-expired grant for this data class/scope?
 *  This is what the future enforce path checks. ISO-string time compare is
 *  cross-DB safe. */
export async function hasActiveBreakGlass(userId: string, dataClass = 'RESTRICTED', scope = '*'): Promise<boolean> {
  const row = await queryOne(
    `SELECT id FROM break_glass_grants
     WHERE user_id=$1 AND data_class=$2 AND status='active' AND expires_at > $3 AND (scope='*' OR scope=$4)
     LIMIT 1`,
    [userId, dataClass.toUpperCase(), nowIso(), scope],
  )
  return !!row
}

/** List grants for a company (for approvers / the shadow report). Flips
 *  past-expiry 'active' rows to 'expired' first so the view is accurate. */
export async function listBreakGlass(companyId: string, opts: { status?: string; limit?: number } = {}): Promise<any[]> {
  await run(`UPDATE break_glass_grants SET status='expired' WHERE company_id=$1 AND status='active' AND expires_at <= $2`, [companyId, nowIso()])
  const limit = Math.min(opts.limit || 100, 500)
  if (opts.status) {
    return queryAll(`SELECT * FROM break_glass_grants WHERE company_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3`, [companyId, opts.status, limit])
  }
  return queryAll(`SELECT * FROM break_glass_grants WHERE company_id=$1 ORDER BY created_at DESC LIMIT $2`, [companyId, limit])
}
