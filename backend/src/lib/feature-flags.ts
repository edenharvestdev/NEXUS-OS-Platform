import { queryOne } from './db'

/**
 * Per-company feature flags for the P0/P1 security rollout. Flags live in
 * `companies.settings.security_flags` (JSON) so behavior can be flipped per
 * tenant WITHOUT a deploy, and rolled back the same way. Everything ships
 * OFF/shadow by default — reading a flag never changes behavior on its own.
 *
 * Global overrides (env), for incident response / kill-switch:
 *   SECURITY_ENFORCE=off  → force every flag OFF (master kill-switch)
 *   P0_FORCE=on / P1_FORCE=on → force the matching-prefix flags ON (testing)
 */

type CacheEntry = { settings: Record<string, unknown>; at: number }
const CACHE = new Map<string, CacheEntry>()
const TTL_MS = 30_000

async function companySettings(companyId?: string): Promise<Record<string, unknown>> {
  if (!companyId) return {}
  const cached = CACHE.get(companyId)
  const now = Date.now()
  if (cached && now - cached.at < TTL_MS) return cached.settings
  let settings: Record<string, unknown> = {}
  try {
    const row = await queryOne('SELECT settings FROM companies WHERE id = $1', [companyId])
    const raw = (row?.settings ?? '{}') as string
    settings = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>)
  } catch {
    settings = {}
  }
  CACHE.set(companyId, { settings, at: now })
  return settings
}

/** Raw flag value as stored (true | 'shadow' | 'enforce' | undefined). */
export async function getFlag(companyId: string | undefined, flag: string): Promise<unknown> {
  if (process.env.SECURITY_ENFORCE === 'off') return undefined
  const prefix = flag.split('.')[0].toUpperCase() // 'p0' -> 'P0'
  if (process.env[`${prefix}_FORCE`] === 'on') return 'enforce'
  const settings = await companySettings(companyId)
  const flags = (settings.security_flags ?? {}) as Record<string, unknown>
  return flags[flag]
}

/** Convenience boolean — true when the flag is on/enforced (NOT shadow). */
export async function isFlagOn(companyId: string | undefined, flag: string): Promise<boolean> {
  const v = await getFlag(companyId, flag)
  return v === true || v === 'on' || v === 'enforce'
}

/** Invalidate the 30s cache (call after a flag write). */
export function clearFlagCache(companyId?: string): void {
  if (companyId) CACHE.delete(companyId)
  else CACHE.clear()
}
