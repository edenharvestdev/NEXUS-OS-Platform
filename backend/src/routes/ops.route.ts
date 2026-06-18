import { Router } from 'express'
import * as c from '../controllers/ops.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.use(requireRole('admin', 'it'))

r.post('/backup', c.triggerBackup)
r.get('/backups', c.getBackups)
r.get('/queue', c.queueStatus)
r.get('/migrations', c.migrationsStatus)
r.get('/metrics', c.slowRequests)

export default r
