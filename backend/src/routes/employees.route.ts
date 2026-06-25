import { Router } from 'express'
import * as c from '../controllers/employees.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/', requireRole('admin', 'ceo', 'hr', 'it'), c.getAll)
r.post('/', requireRole('admin', 'hr'), c.create)
r.patch('/:id', requireRole('admin', 'hr'), c.update)
r.post('/:id/review', requireRole('admin', 'hr'), c.reviewPerformance)
r.delete('/:id', requireRole('admin', 'hr'), c.remove)
export default r
