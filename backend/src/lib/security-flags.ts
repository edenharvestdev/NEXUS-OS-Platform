import { getFlag } from './feature-flags'

/**
 * Tri-state rollout mode for a security control, per company:
 *   'off'     — control inactive (default).
 *   'shadow'  — control runs but only LOGS what it WOULD do (no behavior change).
 *   'enforce' — control actually changes behavior (needs sign-off to flip).
 *
 * Every P0/P1 security change reads its mode here so it can ship dark, prove
 * itself in shadow, and be flipped to enforce one flag/company at a time —
 * reversible by editing companies.settings (no deploy, no schema rollback).
 */
export type EnforceMode = 'off' | 'shadow' | 'enforce'

export async function enforceMode(companyId: string | undefined, flag: string): Promise<EnforceMode> {
  if (process.env.SECURITY_ENFORCE === 'off') return 'off' // master kill-switch
  const v = await getFlag(companyId, flag)
  if (v === 'enforce' || v === true || v === 'on') return 'enforce'
  if (v === 'shadow') return 'shadow'
  return 'off'
}

export async function isEnforcing(companyId: string | undefined, flag: string): Promise<boolean> {
  return (await enforceMode(companyId, flag)) === 'enforce'
}

export async function isShadowing(companyId: string | undefined, flag: string): Promise<boolean> {
  return (await enforceMode(companyId, flag)) === 'shadow'
}
