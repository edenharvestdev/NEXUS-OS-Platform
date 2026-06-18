import { Router } from 'express'
import * as c from '../controllers/tamada.controller'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'

const r = Router()
r.use(authMiddleware)
r.get('/taxonomy', c.getTaxonomy)
r.get('/entities', c.getEntities)
r.get('/branches', c.getBranches)
r.get('/ingest-mapping', c.getIngestMapping)
r.post('/seed', requireRole('admin', 'it'), c.seedTamada)

export default r
