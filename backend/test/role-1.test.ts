import { test } from 'node:test'
import assert from 'node:assert'
import { ROLES, ROLE_HIERARCHY, roleRank, canAccessModule, MODULE_ACCESS } from '../src/lib/rbac'
import { resolveDataClass } from '../src/lib/authz'
import { APPROVER_ROLES } from '../src/lib/break-glass'

test('ROLE-1: new roles added additively; existing roles untouched', () => {
  for (const r of ['platform_superadmin', 'owner', 'it_security']) assert.ok(ROLES.includes(r as any), `missing ${r}`)
  for (const r of ['admin', 'ceo', 'hr', 'finance', 'it', 'medical', 'staff']) assert.ok(ROLES.includes(r as any))
})

test('ROLE-1: hierarchy ranks platform_superadmin > owner > ceo > admin > staff', () => {
  assert.ok(roleRank('platform_superadmin') > roleRank('owner'))
  assert.ok(roleRank('owner') > roleRank('ceo'))
  assert.ok(roleRank('ceo') > roleRank('admin'))
  assert.ok(roleRank('admin') > roleRank('staff'))
  assert.equal(roleRank('unknown-role'), 0)
})

test('ROLE-1: owner reads HARD; platform_superadmin & it_security do NOT (break-glass only)', () => {
  assert.equal(resolveDataClass({ role: 'owner' }, 'HARD').allowed, true)
  assert.equal(resolveDataClass({ role: 'platform_superadmin' }, 'HARD').allowed, false)
  assert.equal(resolveDataClass({ role: 'it_security' }, 'HARD').allowed, false)
  // RESTRICTED is break-glass-only for EVERY role, including owner
  assert.equal(resolveDataClass({ role: 'owner' }, 'RESTRICTED').allowed, false)
  assert.equal(resolveDataClass({ role: 'platform_superadmin' }, 'RESTRICTED').allowed, false)
})

test('ROLE-1: platform_superadmin/it_security get security modules, NOT business-data modules', () => {
  assert.equal(canAccessModule('platform_superadmin', 'settings'), true)
  assert.equal(canAccessModule('platform_superadmin', 'audit'), true)
  assert.equal(canAccessModule('platform_superadmin', 'payroll'), false)  // no salary module by role
  assert.equal(canAccessModule('platform_superadmin', 'medical'), false)  // no PHI module by role
  assert.equal(canAccessModule('it_security', 'audit'), true)
  assert.equal(canAccessModule('it_security', 'payroll'), false)
})

test('ROLE-1: owner reaches every executive module ceo/admin reach', () => {
  for (const m of Object.keys(MODULE_ACCESS)) {
    if (MODULE_ACCESS[m].includes('ceo' as any) || MODULE_ACCESS[m].includes('admin' as any)) {
      assert.ok(canAccessModule('owner', m), `owner should reach ${m}`)
    }
  }
})

test('ROLE-1: approvers = owner/ceo/admin/it_security; NOT platform_superadmin or generic it', () => {
  for (const r of ['owner', 'ceo', 'admin', 'it_security']) assert.ok(APPROVER_ROLES.includes(r), r)
  assert.ok(!APPROVER_ROLES.includes('platform_superadmin')) // owner-vs-platform boundary
  assert.ok(!APPROVER_ROLES.includes('it'))                  // generic IT replaced by it_security
})

test('ROLE-1: no escalation for existing roles (behavior unchanged)', () => {
  assert.equal(canAccessModule('medical', 'medical'), true)
  assert.equal(canAccessModule('medical', 'payroll'), false)
  assert.equal(canAccessModule('staff', 'settings'), false)
  assert.equal(canAccessModule('finance', 'finance'), true)
  assert.equal(canAccessModule('admin', 'settings'), true) // admin's existing access intact
})
