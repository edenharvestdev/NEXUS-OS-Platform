# Soft Delete Matrix v1 — NEXUS OS

> Baseline as of Soft Delete v1 (additive/dark). Regenerate from code:
> `cd backend && node --require ts-node/register scripts/soft-delete-matrix.ts`.
> Source of truth: `backend/src/lib/soft-delete.ts` (`SOFT_DELETE_RESOURCES`,
> `RESTORE_ROLES`, `VIEW_DELETED_ROLES`, `PLATFORM_VIEW_ROLE`).

Dark by default (`SOFT_DELETE` off → existing deletes hard-delete as today). When
`SOFT_DELETE=on`, the existing delete endpoints route through `softDelete()`
(recoverable). Delete + restore are **always tenant-bound**; only
`platform_superadmin` may **view** deleted rows across tenants (never mutate). No
hard delete in v1 — purge/auto-retention is **phase 2**.

## The matrix

| resource | who can delete | who can restore | who sees deleted | retention |
|---|---|---|---|---|
| documents | owner, admin, ceo, it, hr, operations | owner, admin | owner, admin (own tenant) · platform_superadmin (all tenants, view-only) | soft-delete only; purge = phase 2 |
| deals | owner, admin, ceo, sales | owner, admin | same | same |
| campaigns | owner, admin, ceo, marketing | owner, admin | same | same |

- **restore** is a higher bar than delete (owner/admin only) — un-deleting is sensitive.
- **staff / managers** never see deleted rows (every read site of a registered resource carries `deleted_at IS NULL`).

## Lifecycle & audit

`request → delete → (restore | stays deleted) → [purge, phase 2]`. Every event is
`writeAuditStrict` T2: `softdelete.delete`, `softdelete.restore` (reserved:
`softdelete.purge`, `softdelete.retention`). Columns recorded: `deleted_at,
deleted_by, delete_reason, delete_source` and `restored_at, restored_by,
restore_reason`.

## Endpoints

- `DELETE /api/admin/soft-delete/:resource/:id` — soft-delete (always available)
- `POST /api/admin/soft-delete/:resource/:id/restore` — restore (owner/admin)
- `GET /api/admin/soft-delete/:resource` — list deleted (owner/admin own tenant; platform_superadmin cross-tenant, view-only)
- Existing `DELETE /api/{documents,deals,campaigns}/:id` → soft-delete when `SOFT_DELETE=on`, else hard-delete (dark).

## Scope / next

- **v1 resources**: documents, deals, campaigns (every read site covered — leak-free). The registry + matrix extend by: register → migrate → cover all read sites.
- **v2 candidates**: `tasks` (4 read files), `work_logs` (11 read files) — deferred so v1 coverage stays provably complete.
- **Phase 2**: purge + auto-retention (hard removal after a retention window, audited), gated like everything else.
