import { Router } from 'express'
import * as c from '../controllers/notifications.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.get('/unread', c.getUnread)
r.patch('/:id/read', c.readOne)
r.post('/read-all', c.readAll)

export default r
