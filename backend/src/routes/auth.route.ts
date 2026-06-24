import { Router } from 'express'
import {
  signup, signin, getMe,
  getImpersonateTargets, impersonate, stopImpersonate,
} from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.post('/signup', signup)
r.post('/signin', signin)
r.get('/me', authMiddleware, getMe)
r.get('/impersonate/targets', authMiddleware, getImpersonateTargets)
r.post('/impersonate', authMiddleware, impersonate)
r.post('/impersonate/stop', authMiddleware, stopImpersonate)
export default r
