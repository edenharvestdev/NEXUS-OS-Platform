import { Router } from 'express'
import * as c from '../controllers/hr.controller'
import * as p5 from '../controllers/hr-phase5.controller'
import * as p6 from '../controllers/hr-phase6.controller'
import { authMiddleware } from '../middleware/auth'
import { requireModule, requireRole } from '../middleware/rbac'
import { requireStepUp } from '../middleware/step-up'

const r = Router()
r.use(authMiddleware)

// Phase 0 — Control plane
r.get('/me/modules', p6.getMyModules)
r.get('/permission-groups', requireModule('user-groups'), c.getPermissionGroups)
r.post('/permission-groups', requireModule('user-groups'), c.createPermissionGroup)
r.patch('/permission-groups/:id', requireModule('user-groups'), c.updatePermissionGroup)
r.post('/permission-groups/:id/assign', requireModule('user-groups'), c.assignPermissionGroup)
r.delete('/permission-groups/:id/members', requireModule('user-groups'), p6.unassignPermissionGroup)
r.get('/permission-groups/:id/members', requireModule('user-groups'), p6.listGroupMembers)
r.get('/rbac-matrix', requireModule('user-groups'), c.getRbacMatrix)

// Phase 1 — Org
r.get('/org-units', requireModule('org'), c.getOrgUnits)
r.post('/org-units', requireRole('admin', 'hr'), c.createOrgUnit)
r.get('/positions', requireModule('org'), c.getPositions)

// Phase 2 — Time & leave
r.get('/leave-types', requireModule('reports'), c.getLeaveTypes)
r.get('/shifts', requireModule('reports'), c.getShifts)
r.post('/shifts', requireRole('admin', 'hr'), p6.createShift)
r.patch('/shifts/:id', requireRole('admin', 'hr'), p6.updateShift)
r.post('/attendance/clock-in', c.clockIn)
r.post('/attendance/clock-in-qr', p6.clockInQr)
r.post('/attendance/clock-out', c.clockOut)
r.get('/attendance', requireModule('reports'), c.listAttendance)
r.get('/attendance/locations', requireRole('admin', 'hr', 'it'), p6.listAttendanceLocations)
r.post('/attendance/locations', requireRole('admin', 'hr', 'it'), p6.createAttendanceLocation)
r.delete('/attendance/locations/:id', requireRole('admin', 'hr', 'it'), p6.deleteAttendanceLocation)
r.get('/advances', requireModule('advances'), c.listAdvances)
r.post('/advances', requireModule('advances'), c.createAdvance)
r.patch('/advances/:id', requireRole('admin', 'hr', 'finance'), c.reviewAdvance)
r.post('/salary-change', requireRole('admin', 'hr'), requireStepUp('RESTRICTED'), c.recordSalaryChange)

// Leave workflow config + quotas
r.get('/leave-approval-config', requireRole('admin', 'hr'), p6.getLeaveApprovalConfig)
r.patch('/leave-approval-config', requireRole('admin', 'hr'), p6.updateLeaveApprovalConfig)
r.get('/leave-quotas', requireModule('reports'), p6.listLeaveQuotas)
r.patch('/leave-quotas', requireRole('admin', 'hr'), p6.updateLeaveQuota)

// Phase 3-4 — Payroll
r.get('/payroll/settings', requireModule('reports'), c.getPayrollSettings)
r.patch('/payroll/settings', requireRole('admin', 'hr', 'finance'), c.updatePayrollSettings)
r.get('/payroll/periods', requireModule('reports'), c.listPeriods)
r.post('/payroll/periods', requireRole('admin', 'hr', 'finance'), c.createPeriod)
r.get('/payroll/periods/:id', requireModule('reports'), requireStepUp('RESTRICTED'), c.getPeriodDashboard)
r.post('/payroll/periods/:id/calendar', requireRole('admin', 'hr', 'finance'), c.buildCalendar)
r.post('/payroll/periods/:id/calculate', requireRole('admin', 'hr', 'finance'), c.calculatePeriod)
r.post('/payroll/periods/:id/finish', requireRole('admin', 'hr', 'finance'), c.finishPeriod)
r.get('/payroll/employee/:userId/calendar', requireModule('reports'), c.getEmployeeCalendar)
r.get('/payroll/payslip/:userId/:periodId', c.getPayslip)
r.get('/payroll/payslip/:userId/:periodId/export', p5.exportPayslipHtml)
r.get('/payroll/export/:type', requireModule('reports'), p6.exportTaxForm)

// Phase 5 — Leave workflow + OT
r.get('/leave-requests', p5.listHrLeave)
r.post('/leave-requests', p5.createHrLeave)
r.post('/leave-requests/:id/approve', requireRole('admin', 'hr', 'finance'), p5.approveLeaveStep)
r.get('/overtime/types', p5.listOtTypes)
r.get('/overtime/requests', p6.listOtRequestsV2)
r.post('/overtime/requests', p6.createOtRequestV2)
r.patch('/overtime/requests/:id', requireRole('admin', 'hr', 'finance'), p6.approveOtStep)

// Reports
r.get('/reports/:type', requireModule('reports'), c.getHrReport)

export default r
