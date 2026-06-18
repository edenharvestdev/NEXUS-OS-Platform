import { Router } from 'express'
import * as c from '../controllers/settings.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/', c.getSettings)
r.patch('/company', c.updateCompany)
r.patch('/profile', c.updateProfile)
r.patch('/preferences', c.updateSettings)
r.post('/change-password', c.changePassword)

export default r
