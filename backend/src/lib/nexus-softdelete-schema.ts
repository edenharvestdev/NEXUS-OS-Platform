/**
 * Soft Delete v1 columns. Additive, nullable TEXT columns on the v1 resource set
 * — adding them changes no existing query (they are simply absent from current
 * SELECTs). Cross-DB (Postgres + SQLite). ISO-8601 UTC timestamps so any future
 * retention comparison is cross-DB safe.
 *
 * v1 wires exactly these three resources (every read site is covered with a
 * `deleted_at IS NULL` filter — see lib/soft-delete.ts). More resources are added
 * by: register here → migrate → cover all their read sites.
 */
export const SOFT_DELETE_TABLES = ['documents', 'deals', 'campaigns'] as const

const SD_COLUMNS = [
  'deleted_at', 'deleted_by', 'delete_reason', 'delete_source',
  'restored_at', 'restored_by', 'restore_reason',
]

export const SOFT_DELETE_DDL = SOFT_DELETE_TABLES
  .flatMap((t) => SD_COLUMNS.map((c) => `ALTER TABLE ${t} ADD COLUMN ${c} TEXT;`))
  .join('\n')
