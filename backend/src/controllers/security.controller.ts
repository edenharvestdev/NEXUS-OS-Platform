import { Request, Response } from 'express'
import { enrollMfa, confirmMfa, issueStepUp, mfaStatus } from '../lib/mfa'

/** GET /api/security/mfa/status — is the caller enrolled / enabled? */
export async function getMfaStatus(req: Request, res: Response): Promise<void> {
  res.json(await mfaStatus(req.user.id))
}

/** POST /api/security/mfa/enroll — begin TOTP enrollment (returns QR URI + secret). */
export async function postMfaEnroll(req: Request, res: Response): Promise<void> {
  const { otpauthUri, secret } = await enrollMfa(req.user.id, req.user.email || req.user.id)
  res.json({ otpauthUri, secret })
}

/** POST /api/security/mfa/confirm { code } — finish enrollment. */
export async function postMfaConfirm(req: Request, res: Response): Promise<void> {
  const r = await confirmMfa(req.user.id, String(req.body?.code || ''))
  if (!r.ok) { res.status(400).json({ error: r.reason }); return }
  res.json({ ok: true })
}

/** POST /api/security/mfa/step-up { code } — exchange a code for a step-up token. */
export async function postStepUp(req: Request, res: Response): Promise<void> {
  const r = await issueStepUp(req.user.id, String(req.body?.code || ''))
  if (!r.ok) { res.status(400).json({ error: r.reason }); return }
  res.json({ stepUpToken: r.token, expiresIn: r.expiresIn })
}
