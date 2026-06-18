import { Router } from 'express'
import * as c from '../controllers/onboarding.controller'
import { authMiddleware } from '../middleware/auth'

const r = Router()
r.use(authMiddleware)
r.get('/', c.getState)
r.get('/workbook', c.getWorkbook)
r.get('/security-checklist', c.getSecurityChecklist)
r.patch('/tasks/:taskId', c.patchTask)
r.post('/industry', c.selectIndustry)
r.post('/apply-template', c.apply)
r.post('/step', c.step)
r.post('/department', c.addDepartment)
r.post('/decision-rights', c.setDecisionRights)

export default r
