import { Router } from 'express'
import * as c from '../controllers/line.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.get('/config', authMiddleware, c.config)
r.post('/webhook', c.lineRawParser, c.webhook)

export default r
