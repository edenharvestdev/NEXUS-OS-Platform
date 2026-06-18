import { Router } from 'express'
import * as c from '../controllers/deals.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.post('/', c.create)
r.patch('/:id', c.update)
r.post('/:id/analyze', c.analyzeLead)
r.delete('/:id', c.remove)
export default r
