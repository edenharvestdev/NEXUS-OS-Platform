import { Router } from 'express'
import * as c from '../controllers/leave.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/', requireRole('admin', 'hr'), c.getAll)
r.post('/', c.create)
r.patch('/:id', requireRole('admin', 'hr'), c.updateStatus)

export default r
