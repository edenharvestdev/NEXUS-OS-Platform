import { Router } from 'express'
import * as c from '../controllers/audit-log.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/', requireRole('admin', 'ceo', 'it', 'hr'), c.getAll)

export default r
