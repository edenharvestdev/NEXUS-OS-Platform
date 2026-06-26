import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  getMfaStatus, postMfaEnroll, postMfaConfirm, postStepUp,
  postBreakGlassRequest, getBreakGlassList, postBreakGlassApprove, postBreakGlassDeny, postBreakGlassRevoke,
} from '../controllers/security.controller'

const r = Router()
// MFA-1 step-up (shadow). All require an authenticated session; the caller acts
// on their OWN MFA only (user id comes from the token, never the body).
r.get('/mfa/status', authMiddleware, getMfaStatus)
r.post('/mfa/enroll', authMiddleware, postMfaEnroll)
r.post('/mfa/confirm', authMiddleware, postMfaConfirm)
r.post('/mfa/step-up', authMiddleware, postStepUp)

// BG-1 break-glass (shadow). Request needs a fresh step-up (X-Step-Up header).
r.post('/break-glass/request', authMiddleware, postBreakGlassRequest)
r.get('/break-glass', authMiddleware, getBreakGlassList)
r.post('/break-glass/:id/approve', authMiddleware, postBreakGlassApprove)
r.post('/break-glass/:id/deny', authMiddleware, postBreakGlassDeny)
r.post('/break-glass/:id/revoke', authMiddleware, postBreakGlassRevoke)
export default r
