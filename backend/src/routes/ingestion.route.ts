import { Router } from 'express'
import * as c from '../controllers/ingestion.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/jobs', c.getJobs)
r.post('/import', requireRole('admin', 'it', 'finance'), c.importData)

export default r
