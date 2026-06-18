import { Router } from 'express'
import * as c from '../controllers/self-service.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/hub', c.getHub)
r.patch('/profile', c.updateProfile)
r.post('/kpi', c.addKpiEntry)
r.post('/knowledge', c.addKnowledge)
r.post('/patient', c.addPatient)
r.get('/patients', c.listPatients)
r.post('/skill-evidence', c.addSkillEvidence)
r.get('/daily-tasks', c.getDailyTasks)
r.patch('/daily-tasks/:id/complete', c.completeDailyTask)
r.post('/department', c.createOwnDepartment)

export default r
