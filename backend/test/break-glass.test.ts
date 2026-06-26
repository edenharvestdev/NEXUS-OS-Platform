import { test, before } from 'node:test'
import assert from 'node:assert'
import { execMulti, run, newId } from '../src/lib/db'
import { MFA_STEPUP_DDL } from '../src/lib/nexus-mfa-schema'
import { BREAK_GLASS_DDL } from '../src/lib/nexus-breakglass-schema'
import { enrollMfa, confirmMfa, issueStepUp } from '../src/lib/mfa'
import { totp } from '../src/lib/totp'
import { requestBreakGlass, approveBreakGlass, denyBreakGlass, revokeBreakGlass, hasActiveBreakGlass, expireStaleGrants, listBreakGlass } from '../src/lib/break-glass'
import { resolveDataClass } from '../src/lib/authz'

async function freshStepUp(userId: string): Promise<string> {
  const { secret } = await enrollMfa(userId, userId + '@test.local')
  await confirmMfa(userId, totp(secret))
  const su = await issueStepUp(userId, totp(secret))
  return su.token!
}

before(async () => {
  // The dev SQLite's legacy audit_log has a user/company FK; this test audits
  // with synthetic ids (real ids only exist in prod requests), so relax FK
  // enforcement for the test connection. SQLite-only (tests never use PG).
  await execMulti('PRAGMA foreign_keys = OFF')
  await execMulti(
    `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, company_id TEXT, user_id TEXT, action TEXT, resource TEXT, resource_id TEXT, security_tier TEXT, meta TEXT, created_at TEXT DEFAULT (datetime('now')));`,
  )
  await execMulti(MFA_STEPUP_DDL)
  await execMulti(BREAK_GLASS_DDL)
  // The dev SQLite persists across runs — clear this test's grants so a prior
  // run's still-active (e.g. 60-min) grant can't leak into a fresh assertion.
  await run(`DELETE FROM break_glass_grants WHERE user_id LIKE 'bg-%'`)
})

test('BG: a request without a valid step-up is rejected', async () => {
  const r = await requestBreakGlass({ userId: 'bg-1', companyId: 'co1', reason: 'patient emergency', durationMin: 10, stepUpToken: 'bad' })
  assert.equal(r.reason, 'step_up_required')
})

test('BG: self-service (≤15min) is active immediately and queryable', async () => {
  const token = await freshStepUp('bg-1')
  const r = await requestBreakGlass({ userId: 'bg-1', companyId: 'co1', dataClass: 'RESTRICTED', reason: 'patient emergency', durationMin: 10, stepUpToken: token })
  assert.equal(r.ok, true)
  assert.equal(r.status, 'active')
  assert.ok(r.expiresAt)
  assert.equal(await hasActiveBreakGlass('bg-1', 'RESTRICTED'), true)
})

test('BG: >15min needs a SECOND approver (two-person); self/low-priv rejected', async () => {
  const token = await freshStepUp('bg-2')
  const r = await requestBreakGlass({ userId: 'bg-2', companyId: 'co1', reason: 'long audit task', durationMin: 60, stepUpToken: token })
  assert.equal(r.status, 'pending')
  assert.equal(await hasActiveBreakGlass('bg-2'), false)                                   // not active until approved
  assert.equal((await approveBreakGlass(r.grantId!, { id: 'bg-2', role: 'admin', companyId: 'co1' })).reason, 'self_approval_forbidden')
  assert.equal((await approveBreakGlass(r.grantId!, { id: 'x', role: 'staff', companyId: 'co1' })).reason, 'not_authorized')
  assert.equal((await approveBreakGlass(r.grantId!, { id: 'ceo-1', role: 'ceo', companyId: 'co1' })).ok, true)
  assert.equal(await hasActiveBreakGlass('bg-2'), true)                                     // active after approval
})

test('BG: tenant isolation — a privileged user in ANOTHER company cannot touch the grant', async () => {
  const token = await freshStepUp('bg-iso')
  const r = await requestBreakGlass({ userId: 'bg-iso', companyId: 'co1', reason: 'isolation case test', durationMin: 60, stepUpToken: token })
  const foreign = { id: 'attacker', role: 'admin', companyId: 'co2' } // privileged, but different tenant
  assert.equal((await approveBreakGlass(r.grantId!, foreign)).reason, 'not_found')          // masked as not_found
  assert.equal((await denyBreakGlass(r.grantId!, foreign)).reason, 'not_found')
  assert.equal((await revokeBreakGlass(r.grantId!, foreign)).reason, 'not_found')
  // the grant is untouched — a same-tenant approver still works
  assert.equal((await approveBreakGlass(r.grantId!, { id: 'ceo-9', role: 'ceo', companyId: 'co1' })).ok, true)
})

test('BG ROLE-1: owner can approve; platform_superadmin & generic it cannot', async () => {
  const token = await freshStepUp('bg-role')
  const r = await requestBreakGlass({ userId: 'bg-role', companyId: 'co1', reason: 'approver boundary test', durationMin: 60, stepUpToken: token })
  assert.equal((await approveBreakGlass(r.grantId!, { id: 'ps', role: 'platform_superadmin', companyId: 'co1' })).reason, 'not_authorized')
  assert.equal((await approveBreakGlass(r.grantId!, { id: 'it1', role: 'it', companyId: 'co1' })).reason, 'not_authorized')
  assert.equal((await approveBreakGlass(r.grantId!, { id: 'owner1', role: 'owner', companyId: 'co1' })).ok, true)
})

test('BG: deny rejects a pending grant', async () => {
  const token = await freshStepUp('bg-deny')
  const r = await requestBreakGlass({ userId: 'bg-deny', companyId: 'co1', reason: 'should be denied', durationMin: 60, stepUpToken: token })
  assert.equal(r.status, 'pending')
  assert.equal((await denyBreakGlass(r.grantId!, { id: 'ceo-1', role: 'ceo', companyId: 'co1' })).status, 'denied')
  assert.equal(await hasActiveBreakGlass('bg-deny'), false)                                  // denied never activates
})

test('BG: revoke ends an active grant', async () => {
  const token = await freshStepUp('bg-3')
  const r = await requestBreakGlass({ userId: 'bg-3', companyId: 'co1', reason: 'quick check', durationMin: 5, stepUpToken: token })
  assert.equal(await hasActiveBreakGlass('bg-3'), true)
  assert.equal((await revokeBreakGlass(r.grantId!, { id: 'bg-3', companyId: 'co1' })).ok, true)  // owner can revoke
  assert.equal(await hasActiveBreakGlass('bg-3'), false)
})

test('BG: a past-expiry grant flips to expired (audited) and is not active', async () => {
  await run(
    `INSERT INTO break_glass_grants (id, company_id, user_id, data_class, scope, reason, duration_min, status, created_at, activated_at, expires_at)
     VALUES ($1,$2,$3,'RESTRICTED','*','old',5,'active',$4,$4,$5)`,
    [newId(), 'co1', 'bg-4', '2000-01-01T00:00:00.000Z', '2000-01-01T00:05:00.000Z'],
  )
  assert.equal(await hasActiveBreakGlass('bg-4'), false)        // expires_at filter
  assert.ok((await expireStaleGrants('co1')) >= 1)             // flips + audits the stale grant
  const expired = await listBreakGlass('co1', { status: 'expired' })
  assert.ok(expired.some((g) => g.user_id === 'bg-4' && g.status === 'expired'))
})

test('BG is dark: an active grant does NOT change the resolveDataClass decision', async () => {
  // bg-1 holds an active RESTRICTED grant (above), yet the pure policy still
  // denies RESTRICTED unless the caller explicitly passes {breakGlass:true}
  // (which only the future enforce path does).
  assert.equal(resolveDataClass({ role: 'admin' }, 'RESTRICTED').allowed, false)
  assert.equal(resolveDataClass({ role: 'admin' }, 'RESTRICTED', { breakGlass: true }).allowed, true)
})
