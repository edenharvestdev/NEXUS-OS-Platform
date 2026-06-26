import { test, before } from 'node:test'
import assert from 'node:assert'
import { execMulti, run, queryAll, newId } from '../src/lib/db'
import { SOFT_DELETE_DDL } from '../src/lib/nexus-softdelete-schema'
import { softDelete, restore, listDeleted, notDeleted } from '../src/lib/soft-delete'

const CO_A = 'sd-co-a', CO_B = 'sd-co-b'
const owner = (co: string) => ({ id: 'owner-' + co, role: 'owner', companyId: co })
const sales = (co: string) => ({ id: 'sales-' + co, role: 'sales', companyId: co })
const staff = (co: string) => ({ id: 'staff-' + co, role: 'staff', companyId: co })
const platform = { id: 'ps', role: 'platform_superadmin', companyId: 'sd-co-platform' }

async function seedDeal(co: string): Promise<string> {
  const id = newId()
  await run('INSERT INTO deals (id, company_id, name) VALUES ($1,$2,$3)', [id, co, 'deal ' + id.slice(0, 4)])
  return id
}
const visibleIds = async (co: string): Promise<string[]> =>
  (await queryAll(`SELECT id FROM deals WHERE company_id=$1 AND ${notDeleted()}`, [co])).map((r) => r.id)

before(async () => {
  await execMulti('PRAGMA foreign_keys = OFF')
  await execMulti(`CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, company_id TEXT, user_id TEXT, action TEXT, resource TEXT, resource_id TEXT, security_tier TEXT, meta TEXT, created_at TEXT DEFAULT (datetime('now')));`)
  for (const t of ['documents', 'deals', 'campaigns']) {
    await execMulti(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, company_id TEXT, name TEXT);`)
  }
  // ensure the soft-delete columns exist (idempotent — ignore "duplicate column")
  for (const stmt of SOFT_DELETE_DDL.split('\n')) {
    const s = stmt.trim()
    if (s) { try { await execMulti(s) } catch { /* column already present */ } }
  }
})

test('SD: tenant isolation — cannot soft-delete another company\'s row', async () => {
  const id = await seedDeal(CO_A)
  assert.equal((await softDelete('deals', id, owner(CO_B), { reason: 'x' })).reason, 'not_found') // cross-tenant masked
  assert.equal((await softDelete('deals', id, owner(CO_A), { reason: 'cleanup' })).ok, true)       // same tenant works
})

test('SD: visibility — deleted row hidden by notDeleted filter; listDeleted shows it', async () => {
  const id = await seedDeal(CO_A)
  assert.ok((await visibleIds(CO_A)).includes(id))                 // visible before
  await softDelete('deals', id, owner(CO_A), { reason: 'hide me' })
  assert.ok(!(await visibleIds(CO_A)).includes(id))                // hidden after
  const deleted = await listDeleted('deals', owner(CO_A))
  assert.ok(deleted.rows!.some((r) => r.id === id))               // present in trash
})

test('SD: restore authorization — staff/sales cannot; owner can; restored row reappears', async () => {
  const id = await seedDeal(CO_A)
  await softDelete('deals', id, owner(CO_A), { reason: 'd' })
  assert.equal((await restore('deals', id, staff(CO_A), {})).reason, 'not_authorized')
  assert.equal((await restore('deals', id, sales(CO_A), {})).reason, 'not_authorized') // sales deletes but cannot restore
  assert.equal((await restore('deals', id, owner(CO_A), { reason: 'oops' })).ok, true)
  assert.ok((await visibleIds(CO_A)).includes(id))                 // back in normal reads
})

test('SD: delete role gate — staff cannot delete; sales can (deals)', async () => {
  const id = await seedDeal(CO_A)
  assert.equal((await softDelete('deals', id, staff(CO_A), { reason: 'x' })).reason, 'not_authorized')
  assert.equal((await softDelete('deals', id, sales(CO_A), { reason: 'ok' })).ok, true)
})

test('SD: platform_superadmin lists cross-tenant but cannot mutate cross-tenant', async () => {
  const a = await seedDeal(CO_A), b = await seedDeal(CO_B)
  await softDelete('deals', a, owner(CO_A), { reason: 'a' })
  await softDelete('deals', b, owner(CO_B), { reason: 'b' })
  const rows = (await listDeleted('deals', platform)).rows!
  assert.ok(rows.some((r) => r.id === a) && rows.some((r) => r.id === b))   // sees both tenants
  assert.equal((await restore('deals', a, platform, {})).reason, 'not_found') // cannot mutate across tenant
})

test('SD: audit — delete + restore each write a softdelete.* T2 row', async () => {
  const id = await seedDeal(CO_A)
  await softDelete('deals', id, owner(CO_A), { reason: 'audit-del' })
  await restore('deals', id, owner(CO_A), { reason: 'audit-res' })
  const rows = await queryAll(`SELECT action, security_tier FROM audit_log WHERE resource_id=$1 AND action LIKE 'softdelete.%'`, [id])
  const actions = rows.map((r) => r.action)
  assert.ok(actions.includes('softdelete.delete') && actions.includes('softdelete.restore'))
  assert.ok(rows.every((r) => r.security_tier === 'T2'))
})

test('SD: unknown resource is rejected', async () => {
  assert.equal((await softDelete('users', 'x', owner(CO_A), {})).reason, 'unknown_resource')
})

test('SD: double-delete and restore-of-live are rejected', async () => {
  const id = await seedDeal(CO_A)
  await softDelete('deals', id, owner(CO_A), { reason: 'd' })
  assert.equal((await softDelete('deals', id, owner(CO_A), { reason: 'again' })).reason, 'already_deleted')
  await restore('deals', id, owner(CO_A), {})
  assert.equal((await restore('deals', id, owner(CO_A), {})).reason, 'not_deleted')
})
