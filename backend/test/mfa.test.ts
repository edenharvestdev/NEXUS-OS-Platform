import { test, before } from 'node:test'
import assert from 'node:assert'
import { execMulti } from '../src/lib/db'
import { MFA_STEPUP_DDL } from '../src/lib/nexus-mfa-schema'
import { totp } from '../src/lib/totp'
import { enrollMfa, confirmMfa, issueStepUp, verifyStepUp, consumeStepUp, mfaStatus } from '../src/lib/mfa'
import { requireStepUp } from '../src/middleware/step-up'

const U = 'test-mfa-user-1'

before(async () => {
  // Minimal audit_log so writeAuditStrict succeeds, plus the MFA tables.
  await execMulti(
    `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, company_id TEXT, user_id TEXT, action TEXT, resource TEXT, resource_id TEXT, security_tier TEXT, meta TEXT, created_at TEXT DEFAULT (datetime('now')));`,
  )
  await execMulti(MFA_STEPUP_DDL)
})

test('MFA: enroll leaves the user enrolled but not yet enabled', async () => {
  const { secret, otpauthUri } = await enrollMfa(U, 'u@test.local')
  assert.ok(secret && otpauthUri.startsWith('otpauth://totp/'))
  assert.deepEqual(await mfaStatus(U), { enrolled: true, enabled: false })
})

test('MFA: confirm enables; step-up token is single-use and user-bound', async () => {
  const { secret } = await enrollMfa(U, 'u@test.local')
  assert.equal((await confirmMfa(U, '000000')).ok, false)     // wrong code rejected
  assert.equal((await confirmMfa(U, totp(secret))).ok, true)  // correct code enables
  assert.deepEqual(await mfaStatus(U), { enrolled: true, enabled: true })

  const su = await issueStepUp(U, totp(secret))
  assert.equal(su.ok, true)
  assert.ok(su.token)
  assert.equal((await verifyStepUp(su.token!, U)).ok, true)   // verify does not burn
  assert.equal((await verifyStepUp(su.token!, U)).ok, true)
  assert.equal((await consumeStepUp(su.token!, U)).ok, true)  // consume burns it
  assert.equal((await consumeStepUp(su.token!, U)).reason, 'replayed') // replay rejected

  const su2 = await issueStepUp(U, totp(secret))
  assert.equal((await verifyStepUp(su2.token!, 'someone-else')).reason, 'user_mismatch')
})

test('MFA: step-up cannot be issued before enrollment is enabled', async () => {
  await enrollMfa('test-mfa-user-2', 'u2@test.local') // enrolled, not confirmed
  assert.equal((await issueStepUp('test-mfa-user-2', '000000')).reason, 'not_enrolled')
})

test('requireStepUp: SHADOW does not block when step-up is missing (default)', async () => {
  delete process.env.STEP_UP_ENFORCE
  const mw = requireStepUp('RESTRICTED')
  let nexted = false, statusCode = 0
  const req: any = { headers: {}, method: 'GET', path: '/x', user: { id: U } }
  const res: any = { status: (c: number) => { statusCode = c; return { json: () => {} } } }
  await mw(req, res, () => { nexted = true })
  assert.equal(nexted, true)   // continued — shadow
  assert.equal(statusCode, 0)  // never sent 401
})
