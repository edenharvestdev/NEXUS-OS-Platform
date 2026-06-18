import { Router } from 'express'
import * as c from '../controllers/ai-command.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)

r.get('/command-center', requireRole('admin'), c.commandCenter)
r.get('/recommend', requireRole('admin', 'hr', 'finance', 'sales', 'marketing', 'it'), c.recommend)
r.post('/assign', requireRole('admin', 'hr', 'finance', 'sales', 'marketing', 'it'), c.createAssignment)

export default r
