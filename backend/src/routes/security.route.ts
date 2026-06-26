import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getMfaStatus, postMfaEnroll, postMfaConfirm, postStepUp } from '../controllers/security.controller'

const r = Router()
// MFA-1 step-up (shadow). All require an authenticated session; the caller acts
// on their OWN MFA only (user id comes from the token, never the body).
r.get('/mfa/status', authMiddleware, getMfaStatus)
r.post('/mfa/enroll', authMiddleware, postMfaEnroll)
r.post('/mfa/confirm', authMiddleware, postMfaConfirm)
r.post('/mfa/step-up', authMiddleware, postStepUp)
export default r
