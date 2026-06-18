import { Router } from 'express'
import * as c from '../controllers/chat.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.use(authMiddleware)
r.post('/', c.sendMessage)
r.get('/agents', c.listAgents)
r.get('/history', c.getHistory)
r.delete('/history', c.clearHistory)
export default r
