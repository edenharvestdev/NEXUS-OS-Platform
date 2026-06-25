import { Router } from 'express'
import * as c from '../controllers/ai-router.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole, MANAGER_ROLES } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/status', c.status)
r.post('/probe', requireRole('admin', 'it'), c.probe)
r.post('/route', requireRole(...MANAGER_ROLES), c.route)

export default r
