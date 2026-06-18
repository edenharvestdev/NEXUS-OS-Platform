import { Router } from 'express'
import * as c from '../controllers/work-logs.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { idempotencyMiddleware } from '../middleware/idempotency'

const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.post('/', idempotencyMiddleware, c.create)
r.patch('/:id/review', requireRole('admin', 'hr', 'finance', 'sales', 'marketing', 'it'), c.review)
r.post('/escalate', requireRole('admin', 'it'), c.runEscalation)

export default r
