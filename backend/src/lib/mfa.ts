/**
 * MFA-1 — TOTP enrollment + step-up auth. Backend only; SHADOW (nothing requires
 * step-up yet — see middleware/step-up.ts). Every security-relevant event is
 * recorded with writeAuditStrict (T2). Step-up tokens are short-lived JWTs with
 * a single-use jti (replay-protected via step_up_used_jti).
 */
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { queryOne, run } from './db'
import { encryptField, decryptField } from './encryption'
import { generateSecret, verifyTOTP, otpauthURI } from './totp'
import { writeAuditStrict } from './audit'
import { getRequestContext } from './request-context'

const STEP_UP_TTL_SEC = 5 * 60 // a step-up proof is valid for 5 minutes

function jwtSecret(): string {
  return process.env.JWT_SECRET || 'nexasos_dev_secret_change_in_production'
}
function nowIso(): string {
  return new Date().toISOString()
}
function actor() {
  const ctx = getRequestContext()
  return { companyId: ctx.companyId, userId: ctx.actorUserId }
}

export type StepUpResult = { ok: boolean; reason?: string; jti?: string; userId?: string }

/** Begin TOTP enrollment: generate + store an (encrypted) secret, not yet enabled.
 *  Returns the otpauth URI (for a QR) and the raw secret (for manual entry). */
export async function enrollMfa(userId: string, account: string): Promise<{ otpauthUri: string; secret: string }> {
  const secret = generateSecret()
  const enc = encryptField(secret)
  const ts = nowIso()
  const existing = await queryOne('SELECT user_id FROM user_mfa WHERE user_id = $1', [userId])
  if (existing) {
    await run('UPDATE user_mfa SET secret_enc = $1, enabled = 0, updated_at = $2 WHERE user_id = $3', [enc, ts, userId])
  } else {
    await run(
      'INSERT INTO user_mfa (user_id, secret_enc, method, enabled, created_at, updated_at) VALUES ($1,$2,$3,0,$4,$5)',
      [userId, enc, 'totp', ts, ts],
    )
  }
  await writeAuditStrict({ ...actor(), action: 'mfa.enroll_begin', resource: 'user_mfa', resourceId: userId, securityTier: 'T2' })
  return { otpauthUri: otpauthURI(secret, account), secret }
}

/** Confirm enrollment by proving possession of a current code → enabled = 1. */
export async function confirmMfa(userId: string, code: string): Promise<StepUpResult> {
  const row = await queryOne('SELECT secret_enc FROM user_mfa WHERE user_id = $1', [userId])
  if (!row) return { ok: false, reason: 'not_enrolled' }
  if (!verifyTOTP(decryptField(row.secret_enc), code)) {
    await writeAuditStrict({ ...actor(), action: 'mfa.enroll_fail', resource: 'user_mfa', resourceId: userId, securityTier: 'T2' })
    return { ok: false, reason: 'bad_code' }
  }
  const ts = nowIso()
  await run('UPDATE user_mfa SET enabled = 1, verified_at = $1, updated_at = $2 WHERE user_id = $3', [ts, ts, userId])
  await writeAuditStrict({ ...actor(), action: 'mfa.enroll_confirm', resource: 'user_mfa', resourceId: userId, securityTier: 'T2' })
  return { ok: true }
}

/** Exchange a current TOTP code for a single-use, short-lived step-up token. */
export async function issueStepUp(userId: string, code: string): Promise<{ ok: boolean; reason?: string; token?: string; expiresIn?: number }> {
  const row = await queryOne('SELECT secret_enc, enabled FROM user_mfa WHERE user_id = $1', [userId])
  if (!row || !row.enabled) {
    await writeAuditStrict({ ...actor(), action: 'stepup.fail', resource: 'step_up', securityTier: 'T2', meta: { reason: 'not_enrolled' } })
    return { ok: false, reason: 'not_enrolled' }
  }
  if (!verifyTOTP(decryptField(row.secret_enc), code)) {
    await writeAuditStrict({ ...actor(), action: 'stepup.fail', resource: 'step_up', securityTier: 'T2', meta: { reason: 'bad_code' } })
    return { ok: false, reason: 'bad_code' }
  }
  const jti = crypto.randomUUID()
  const token = jwt.sign({ sub: userId, stepUp: true, jti }, jwtSecret(), { expiresIn: STEP_UP_TTL_SEC })
  await writeAuditStrict({ ...actor(), action: 'stepup.issue', resource: 'step_up', resourceId: jti, securityTier: 'T2' })
  return { ok: true, token, expiresIn: STEP_UP_TTL_SEC }
}

/** Decode + validate a step-up token (signature, stepUp claim, optional user
 *  match, not-yet-replayed). Does NOT consume it. */
async function decodeStepUp(token: string, expectedUserId?: string): Promise<StepUpResult> {
  let claims: any
  try { claims = jwt.verify(token, jwtSecret()) } catch { return { ok: false, reason: 'invalid' } }
  if (!claims?.stepUp || !claims?.jti) return { ok: false, reason: 'not_stepup' }
  if (expectedUserId && claims.sub !== expectedUserId) return { ok: false, reason: 'user_mismatch' }
  const used = await queryOne('SELECT jti FROM step_up_used_jti WHERE jti = $1', [claims.jti])
  if (used) return { ok: false, reason: 'replayed' }
  return { ok: true, jti: claims.jti, userId: claims.sub }
}

/** Validate WITHOUT burning the token — for shadow observation. */
export async function verifyStepUp(token: string, expectedUserId?: string): Promise<StepUpResult> {
  return decodeStepUp(token, expectedUserId)
}

/** Validate AND mark the jti used (single-use) — for enforcement. */
export async function consumeStepUp(token: string, expectedUserId?: string): Promise<StepUpResult> {
  const r = await decodeStepUp(token, expectedUserId)
  if (!r.ok) return r
  await run('INSERT INTO step_up_used_jti (jti, user_id, used_at) VALUES ($1,$2,$3)', [r.jti, r.userId || null, nowIso()])
  return r
}

export async function mfaStatus(userId: string): Promise<{ enrolled: boolean; enabled: boolean }> {
  const row = await queryOne('SELECT enabled FROM user_mfa WHERE user_id = $1', [userId])
  return { enrolled: !!row, enabled: !!(row && row.enabled) }
}
