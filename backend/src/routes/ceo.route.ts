import { Router } from 'express'
import * as c from '../controllers/ceo.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/brief', requireRole('admin'), c.getBrief)

export default r
