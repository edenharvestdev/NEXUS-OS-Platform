import { Router } from 'express'
import * as c from '../controllers/tasks.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.post('/', c.create)
r.patch('/:id', c.update)
r.delete('/:id', c.remove)

export default r
