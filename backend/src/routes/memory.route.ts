import { Router } from 'express'
import * as c from '../controllers/memory.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/search', c.search)
r.post('/explain', c.explain)

export default r
