import { Router } from 'express'
import * as c from '../controllers/campaigns.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.post('/', c.create)
r.patch('/:id', c.update)
r.post('/:id/analyze', c.analyzeCampaign)
r.delete('/:id', c.remove)
export default r
