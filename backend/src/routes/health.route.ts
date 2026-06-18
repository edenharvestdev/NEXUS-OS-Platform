import { Router } from 'express'
import * as c from '../controllers/health.controller'
import * as readiness from '../controllers/readiness.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/score', c.getHealthScore)
r.get('/readiness', readiness.getReadiness)
r.post('/simulate', c.simulateFeasibility)

export default r
