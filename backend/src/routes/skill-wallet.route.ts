import { Router } from 'express'
import * as c from '../controllers/skill-wallet.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.get('/me', c.getMine)
r.post('/recompute', c.recompute)

export default r
