import { test } from 'node:test'
import assert from 'node:assert'
import { resolveModule, resolveDataClass, tierToClass, shadowCheck, roleModuleScope, DATA_CLASS_POLICY } from '../src/lib/authz'
import { canAccessModule } from '../src/lib/rbac'
import { canViewTier } from '../src/lib/encryption'

test('AUTHZ-2: RESTRICTED is break-glass only (incl admin & hr)', () => {
  assert.equal(resolveDataClass({ role: 'admin' }, 'RESTRICTED').allowed, false)
  assert.equal(resolveDataClass({ role: 'hr' }, 'RESTRICTED').allowed, false)
  // an active break-glass grant unlocks it
  assert.equal(resolveDataClass({ role: 'admin' }, 'RESTRICTED', { breakGlass: true }).allowed, true)
})

test('AUTHZ-2: HARD = owner/exec/HR only (finance/it dropped)', () => {
  for (const role of ['admin', 'ceo', 'hr']) assert.equal(resolveDataClass({ role }, 'HARD').allowed, true)
  for (const role of ['finance', 'it', 'staff', 'medical']) assert.equal(resolveDataClass({ role }, 'HARD').allowed, false)
})

test('AUTHZ-2: roleModuleScope replaces admin wildcard with an explicit set', () => {
  const scoped = roleModuleScope('admin')
  assert.ok(Array.isArray(scoped) && scoped.length > 5)   // a concrete list, not '*'
  assert.ok(scoped.includes('settings'))                   // admin IS listed for settings
  assert.ok(!scoped.includes('staff'))                     // admin is NOT in staff module
  assert.deepEqual([...scoped].sort(), scoped)             // sorted/stable
})

test('AUTHZ-2: DATA_CLASS_POLICY matrix is the documented source of truth', () => {
  assert.equal(DATA_CLASS_POLICY.RESTRICTED.roles.length, 0) // no role by default
  assert.deepEqual(DATA_CLASS_POLICY.HARD.roles, ['admin', 'ceo', 'hr'])
  assert.equal(DATA_CLASS_POLICY.BASIC.roles, '*')
})

test('least-privilege module access — no super-admin bypass', () => {
  assert.equal(resolveModule({ role: 'admin' }, 'settings').allowed, true)  // admin IS listed for settings
  assert.equal(resolveModule({ role: 'admin' }, 'staff').allowed, false)    // admin NOT in staff=['staff']
  assert.equal(resolveModule({ role: 'medical' }, 'medical').allowed, true)
  assert.equal(resolveModule({ role: 'medical' }, 'finance').allowed, false)
})

test('least-privilege data class — RESTRICTED denied for everyone incl admin', () => {
  assert.equal(resolveDataClass({ role: 'admin' }, 'RESTRICTED').allowed, false)
  assert.equal(resolveDataClass({ role: 'hr' }, 'RESTRICTED').allowed, false)
  assert.equal(resolveDataClass({ role: 'admin' }, 'HARD').allowed, true)
  assert.equal(resolveDataClass({ role: 'finance' }, 'HARD').allowed, false)  // over-grant today
  assert.equal(resolveDataClass({ role: 'staff' }, 'MEDIUM').allowed, true)
})

test('tierToClass maps legacy tiers', () => {
  assert.equal(tierToClass('T3'), 'RESTRICTED')
  assert.equal(tierToClass('T2'), 'HARD')
  assert.equal(tierToClass('T1'), 'BASIC')
  assert.equal(tierToClass(undefined), 'BASIC')
})

test('AUTHZ-1 does NOT change live behavior (shadow only)', () => {
  delete process.env.AUTHZ_SHADOW
  assert.equal(canAccessModule('admin', 'staff'), true)      // admin bypass preserved
  assert.equal(canAccessModule('medical', 'finance'), false) // unchanged
  assert.equal(canViewTier('admin', 'T3'), true)             // admin still sees T3 (live)
  assert.equal(canViewTier('staff', 'T3'), false)            // unchanged
  assert.equal(canViewTier('finance', 'T2'), true)           // unchanged
})

test('shadowCheck is a no-op (no throw) when AUTHZ_SHADOW is off', () => {
  delete process.env.AUTHZ_SHADOW
  assert.doesNotThrow(() => shadowCheck('x', true, { allowed: false, reason: 'r' }))
})
