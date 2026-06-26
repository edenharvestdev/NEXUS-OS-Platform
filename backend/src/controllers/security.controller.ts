import { Request, Response } from 'express'
import { enrollMfa, confirmMfa, issueStepUp, mfaStatus } from '../lib/mfa'
import { requestBreakGlass, approveBreakGlass, denyBreakGlass, revokeBreakGlass, listBreakGlass } from '../lib/break-glass'

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

// ── Break-glass (BG-1) ────────────────────────────────────────────
const STATUS_FOR_REASON: Record<string, number> = {
  step_up_required: 401, self_approval_forbidden: 403, not_authorized: 403, not_found: 404,
}
function bgError(res: Response, reason?: string): void {
  res.status(STATUS_FOR_REASON[reason || ''] || 400).json({ error: reason })
}

/** POST /api/security/break-glass/request — needs X-Step-Up header. */
export async function postBreakGlassRequest(req: Request, res: Response): Promise<void> {
  const r = await requestBreakGlass({
    userId: req.user.id,
    companyId: req.user.company_id,
    dataClass: req.body?.dataClass,
    scope: req.body?.scope,
    reason: String(req.body?.reason || ''),
    durationMin: Number(req.body?.durationMin) || 15,
    stepUpToken: (req.headers['x-step-up'] as string) || '',
  })
  if (!r.ok) { bgError(res, r.reason); return }
  res.json(r)
}

export async function getBreakGlassList(req: Request, res: Response): Promise<void> {
  res.json(await listBreakGlass(req.user.company_id, { status: req.query.status as string | undefined }))
}

export async function postBreakGlassApprove(req: Request, res: Response): Promise<void> {
  const r = await approveBreakGlass(String(req.params.id), { id: req.user.id, role: req.user.role, companyId: req.user.company_id })
  if (!r.ok) { bgError(res, r.reason); return }
  res.json(r)
}

export async function postBreakGlassDeny(req: Request, res: Response): Promise<void> {
  const r = await denyBreakGlass(String(req.params.id), { id: req.user.id, role: req.user.role, companyId: req.user.company_id })
  if (!r.ok) { bgError(res, r.reason); return }
  res.json(r)
}

export async function postBreakGlassRevoke(req: Request, res: Response): Promise<void> {
  const r = await revokeBreakGlass(String(req.params.id), { id: req.user.id, role: req.user.role, companyId: req.user.company_id })
  if (!r.ok) { bgError(res, r.reason); return }
  res.json(r)
}
