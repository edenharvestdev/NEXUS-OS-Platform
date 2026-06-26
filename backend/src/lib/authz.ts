/**
 * AUTHZ-1 — central least-privilege policy engine, running in SHADOW only.
 *
 * Today access control has a hard super-admin in four places (rbac.canAccessModule,
 * middleware/requireRole, user-permissions wildcard, encryption.canViewTier).
 * This engine encodes what least-privilege WOULD decide and lets those four
 * points report the divergences (where the live decision is MORE permissive than
 * least-privilege — i.e. a bypass) WITHOUT changing any live decision.
 *
 * Completely dark by default: nothing is logged unless AUTHZ_SHADOW=on, and the
 * engine NEVER alters a live allow/deny in this PR. Enforcement comes later
 * (AUTHZ-2+) behind its own flag + break-glass.
 *
 * NOTE: imports only ./rbac (+ request-context, audit). Callers in rbac.ts must
 * lazy-require this module to avoid a load-time cycle (rbac ⇄ authz).
 */
import { MODULE_ACCESS, normalizeRole } from './rbac'
import { getRequestContext } from './request-context'
import { writeAudit } from './audit'

export type Actor = { role?: string; userId?: string; companyId?: string }
export type AccessDecision = { allowed: boolean; reason: string }
export type DataClass = 'BASIC' | 'MEDIUM' | 'HARD' | 'RESTRICTED'

const TIER_TO_CLASS: Record<string, DataClass> = { T0: 'BASIC', T1: 'BASIC', T2: 'HARD', T3: 'RESTRICTED' }
export function tierToClass(tier?: string): DataClass {
  return TIER_TO_CLASS[(tier || 'T1').toUpperCase()] || 'BASIC'
}

/** Roles allowed to read HARD data under least-privilege (owner/exec/HR). */
const HARD_ROLES = ['admin', 'ceo', 'hr']

/** Least-privilege MODULE access — like canAccessModule but with NO super-admin
 *  short-circuit: admin must be listed for the module like any other role. */
export function resolveModule(actor: Actor, module: string): AccessDecision {
  const r = normalizeRole(actor.role)
  const allowed = MODULE_ACCESS[module]
  if (!allowed) return { allowed: false, reason: `module '${module}' has no access list` }
  if (allowed.includes(r as never)) return { allowed: true, reason: `role '${r}' in module '${module}'` }
  return { allowed: false, reason: `role '${r}' NOT in module '${module}' (no super-admin bypass)` }
}

/**
 * Least-privilege DATA-CLASS access (the matrix). RESTRICTED is granted to NO
 * role by default (incl. admin AND hr) — it needs an ACTIVE break-glass grant
 * (issuance comes in the break-glass PR; the engine only checks for one here).
 * HARD is owner/exec/HR only (finance/it dropped vs today's canViewTier).
 */
export function resolveDataClass(actor: Actor, cls: DataClass, opts: { breakGlass?: boolean } = {}): AccessDecision {
  const r = normalizeRole(actor.role)
  if (cls === 'BASIC' || cls === 'MEDIUM') return { allowed: true, reason: `${cls} broadly readable` }
  if (cls === 'HARD') {
    return HARD_ROLES.includes(r)
      ? { allowed: true, reason: `role '${r}' may read HARD (owner/exec/HR)` }
      : { allowed: false, reason: `role '${r}' may not read HARD (owner/exec/HR only)` }
  }
  // RESTRICTED — break-glass only, for EVERY role including admin.
  if (opts.breakGlass) return { allowed: true, reason: 'RESTRICTED via active break-glass grant' }
  return { allowed: false, reason: `RESTRICTED requires an active break-glass grant (role '${r}' has none)` }
}

/** Explicit DATA policy matrix — the documented source of truth. */
export const DATA_CLASS_POLICY: Record<DataClass, { roles: string[] | '*'; note: string }> = {
  BASIC: { roles: '*', note: 'every authenticated user in the company' },
  MEDIUM: { roles: '*', note: 'every user (row-level dept/branch scoping added later)' },
  HARD: { roles: HARD_ROLES, note: 'data owner + manager + HR + exec' },
  RESTRICTED: { roles: [], note: 'NO role by default — active break-glass grant only (incl. admin & hr)' },
}

/** Explicit module scope for a role = the modules it is listed for. This is the
 *  least-privilege REPLACEMENT for the admin "*" wildcard: under enforcement
 *  admin would get THIS set, not everything. */
export function roleModuleScope(role: string): string[] {
  const r = normalizeRole(role)
  return Object.keys(MODULE_ACCESS).filter(m => (MODULE_ACCESS[m] as string[]).includes(r)).sort()
}

/** "Would allow / would deny" probe (diagnostics / future enforce). */
export function wouldAccess(
  actor: Actor,
  target: { module?: string; dataClass?: DataClass; breakGlass?: boolean },
): AccessDecision {
  if (target.module) return resolveModule(actor, target.module)
  if (target.dataClass) return resolveDataClass(actor, target.dataClass, { breakGlass: target.breakGlass })
  return { allowed: false, reason: 'no target specified' }
}

// In-memory dedup so a hot path can't flood the audit log during a shadow window.
const recent = new Map<string, number>()
const DEDUP_MS = 60_000
function shouldLog(key: string): boolean {
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < DEDUP_MS) return false
  recent.set(key, now)
  if (recent.size > 2000) recent.clear()
  return true
}

/**
 * Observe a live access decision against least-privilege and LOG it only if the
 * live decision is MORE permissive (a bypass). Returns nothing and NEVER changes
 * behavior. Silent unless AUTHZ_SHADOW=on. Logging is best-effort (fire-and-forget)
 * so a sync caller (canAccessModule/requireRole/canViewTier) is never blocked.
 */
export function shadowCheck(
  point: string,
  currentAllowed: boolean,
  leastPriv: AccessDecision,
  detail: Record<string, unknown> = {},
): void {
  if (process.env.AUTHZ_SHADOW !== 'on') return // dark by default
  if (!(currentAllowed && !leastPriv.allowed)) return // only divergent bypasses
  const ctx = getRequestContext()
  if (!shouldLog(`${point}|${ctx.actorUserId || ''}|${leastPriv.reason}`)) return
  void writeAudit({
    companyId: ctx.companyId,
    userId: ctx.actorUserId,
    action: 'authz.shadow_would_deny',
    resource: point,
    securityTier: 'T1',
    meta: {
      point,
      actor_role: ctx.actorRole,
      least_privilege_reason: leastPriv.reason,
      endpoint: ctx.endpoint,
      method: ctx.method,
      ...detail,
    },
  }).catch(() => {})
}
