import { Router } from 'express'
import * as c from '../controllers/ai-router.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/status', c.status)
r.post('/probe', requireRole('admin', 'it'), c.probe)
r.post('/route', requireRole('admin', 'hr', 'finance', 'sales', 'marketing', 'it'), c.route)

export default r
