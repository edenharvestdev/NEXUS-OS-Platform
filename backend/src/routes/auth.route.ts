import { Router } from 'express'
import { signup, signin, getMe } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.post('/signup', signup)
r.post('/signin', signin)
r.get('/me', authMiddleware, getMe)
export default r
