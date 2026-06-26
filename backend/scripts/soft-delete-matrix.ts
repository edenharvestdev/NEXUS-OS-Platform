/**
 * Soft Delete Matrix v1 — prints the authoritative matrix straight from the code
 * (lib/soft-delete.ts), so the doc can never drift from what is enforced.
 * Read-only.  node --require ts-node/register scripts/soft-delete-matrix.ts
 */
import { SOFT_DELETE_RESOURCES, RESTORE_ROLES, VIEW_DELETED_ROLES, PLATFORM_VIEW_ROLE } from '../src/lib/soft-delete'

console.log('# Soft Delete Matrix v1 — NEXUS OS\n')
console.log('Dark by default (`SOFT_DELETE` off). Restore + delete are ALWAYS tenant-bound;')
console.log(`only ${PLATFORM_VIEW_ROLE} may VIEW deleted rows across tenants (never mutate).`)
console.log('No hard delete (purge = phase 2). Generated from code.\n')
console.log('| resource | who can delete | who can restore | who sees deleted | retention |')
console.log('|---|---|---|---|---|')
const seeDeleted = `${VIEW_DELETED_ROLES.join(', ')} (own tenant) · ${PLATFORM_VIEW_ROLE} (all tenants, view-only)`
for (const [resource, d] of Object.entries(SOFT_DELETE_RESOURCES)) {
  console.log(`| ${resource} | ${d.deleteRoles.join(', ')} | ${RESTORE_ROLES.join(', ')} | ${seeDeleted} | soft-delete only; purge = phase 2 |`)
}
console.log('\nView-deleted roles:', [...VIEW_DELETED_ROLES, PLATFORM_VIEW_ROLE].join(', '))
console.log('Restore roles:', RESTORE_ROLES.join(', '), '(higher bar than delete).')
process.exit(0)
