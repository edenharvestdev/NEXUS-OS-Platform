import { Request, Response } from 'express'
import {
  getOnboardingState,
  setIndustry,
  applyTemplate,
  advanceStep,
  createDepartment,
  updateTaskStatus,
  getWorkbookTemplate,
  evaluateSecurityChecklist,
  confirmDecisionRights,
  completeOnboarding,
} from '../lib/onboarding'

export async function getState(req: Request, res: Response): Promise<void> {
  res.json(await getOnboardingState(req.user.company_id))
}

export async function getWorkbook(req: Request, res: Response): Promise<void> {
  res.json(await getWorkbookTemplate())
}

export async function getSecurityChecklist(req: Request, res: Response): Promise<void> {
  res.json({
    data: await evaluateSecurityChecklist(req.user.company_id),
  })
}

export async function selectIndustry(req: Request, res: Response): Promise<void> {
  const { industry } = req.body
  if (!industry) { res.status(400).json({ error: 'industry required' }); return }
  const tpl = await setIndustry(req.user.company_id, industry, req.user.id)
  res.json({ success: true, template: { id: tpl.id, name: tpl.name_th } })
}

export async function apply(req: Request, res: Response): Promise<void> {
  const { industry } = req.body
  const result = await applyTemplate(req.user.company_id, industry || 'generic', req.user.id)
  res.json({ success: true, ...result })
}

export async function step(req: Request, res: Response): Promise<void> {
  const { step: s } = req.body
  await advanceStep(req.user.company_id, Number(s))
  res.json({ success: true })
}

export async function patchTask(req: Request, res: Response): Promise<void> {
  const taskId = String(req.params.taskId)
  const { status } = req.body
  if (!['pending', 'in_progress', 'done'].includes(status)) {
    res.status(400).json({ error: 'status must be pending | in_progress | done' })
    return
  }
  await updateTaskStatus(req.user.company_id, taskId, status)
  res.json(await getOnboardingState(req.user.company_id))
}

export async function addDepartment(req: Request, res: Response): Promise<void> {
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return }
  const dept = await createDepartment(req.user.company_id, name.trim(), req.user.id)
  res.status(201).json(dept)
}

export async function complete(req: Request, res: Response): Promise<void> {
  if (!['admin', 'hr', 'it'].includes(req.user.role)) {
    res.status(403).json({ error: 'Admin only' })
    return
  }
  await completeOnboarding(req.user.company_id, req.user.id)
  res.json(await getOnboardingState(req.user.company_id))
}

export async function setDecisionRights(req: Request, res: Response): Promise<void> {
  if (!['admin', 'management'].includes(req.user.role)) {
    res.status(403).json({ error: 'Admin only' })
    return
  }
  const { rights } = req.body
  if (!rights || typeof rights !== 'object') {
    res.status(400).json({ error: 'rights object required' })
    return
  }
  const allowed = ['auto', 'suggest', 'human']
  for (const [k, v] of Object.entries(rights)) {
    if (!allowed.includes(String(v))) {
      res.status(400).json({ error: `Invalid decision right for ${k}` })
      return
    }
  }
  await confirmDecisionRights(req.user.company_id, req.user.id, rights as Record<string, string>)
  res.json(await getOnboardingState(req.user.company_id))
}
