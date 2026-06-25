import { Router } from 'express'
import * as c from '../controllers/ai-command.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole, MANAGER_ROLES } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)

r.get('/command-center', requireRole('admin', 'ceo'), c.commandCenter)
r.get('/recommend', requireRole(...MANAGER_ROLES), c.recommend)
r.post('/assign', requireRole(...MANAGER_ROLES), c.createAssignment)

export default r
