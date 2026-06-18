import { Router } from 'express'
import * as c from '../controllers/ai-stats.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
const r = Router()
r.use(authMiddleware)
r.get('/', requireRole('admin', 'it'), c.getStats)
export default r
