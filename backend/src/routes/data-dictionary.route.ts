import { Router } from 'express'
import * as c from '../controllers/data-dictionary.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/layers', c.getLayers)
r.get('/', c.getAll)
r.post('/', c.create)
r.patch('/:id', c.update)
r.delete('/:id', requireRole('admin'), c.remove)

export default r
