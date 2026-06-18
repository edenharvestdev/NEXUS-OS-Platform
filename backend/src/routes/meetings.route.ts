import { Router } from 'express'
import * as c from '../controllers/meetings.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.post('/analyze', c.analyze)
r.patch('/action/:id', c.toggleAction)
r.patch('/:id', c.update)
export default r
