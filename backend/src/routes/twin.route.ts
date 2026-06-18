import { Router } from 'express'
import * as c from '../controllers/twin.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)

export default r
