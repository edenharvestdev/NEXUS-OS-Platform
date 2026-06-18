import { Router } from 'express'
import * as c from '../controllers/user-ai.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/files', c.listFiles)
r.post('/files', c.uploadFile)
r.get('/files/:id', c.getFile)
r.delete('/files/:id', c.deleteFile)
r.get('/memory', c.listMemory)

export default r
