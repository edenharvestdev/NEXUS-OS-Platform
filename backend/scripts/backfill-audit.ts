/**
 * Backfill the legacy `audit_log` (singular) into the new append-only
 * `audit_logs`. Idempotent (skips rows already present by id) and OFF-PATH —
 * never run at boot. Safe to re-run.
 *
 * Historical rows get a content row_hash with prev_hash = null ('backfill'
 * marker); the live hash-chain begins from new v2 writes. Run with the target
 * DATABASE_URL injected (or none for local SQLite):
 *   DATABASE_URL="$PUBLIC_URL" node --require ts-node/register scripts/backfill-audit.ts
 */
import crypto from 'crypto'
import { queryAll, queryOne, run } from '../src/lib/db'

async function main() {
  let legacy: any[]
  try {
    legacy = await queryAll('SELECT * FROM audit_log ORDER BY created_at ASC', [])
  } catch (e) {
    console.error('Could not read legacy audit_log (does it exist?):', (e as Error).message)
    process.exit(1)
  }

  let inserted = 0
  let skipped = 0
  for (const r of legacy) {
    const exists = await queryOne('SELECT audit_log_id FROM audit_logs WHERE audit_log_id = $1', [r.id])
    if (exists) { skipped++; continue }

    let meta: Record<string, unknown> = {}
    try { meta = JSON.parse(r.meta || '{}') } catch { meta = {} }
    const createdAt = typeof r.created_at === 'string' && r.created_at
      ? r.created_at
      : new Date(r.created_at || Date.now()).toISOString()
    const core = JSON.stringify({ id: r.id, action: r.action, table: r.resource, targetId: r.resource_id, ts: createdAt })
    const rowHash = crypto.createHash('sha256').update(`backfill|${core}`).digest('hex')
    const j = (v: unknown) => (v === undefined || v === null ? null : JSON.stringify(v))

    await run(
      `INSERT INTO audit_logs (
        audit_log_id, company_id, actor_user_id, action_type, target_table, target_id,
        target_security_level, before_value_json, after_value_json, result_status,
        prev_hash, row_hash, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        r.id, r.company_id || null, r.user_id || null, r.action, r.resource || null, r.resource_id || null,
        r.security_tier || 'T1', j(meta.before), j(meta.after), 'success',
        null, rowHash, createdAt,
      ],
    )
    inserted++
  }

  console.log(`✅ backfill-audit: ${inserted} inserted, ${skipped} already present (of ${legacy.length} legacy rows)`)
  process.exit(0)
}

main().catch(e => { console.error('backfill failed:', e); process.exit(1) })
