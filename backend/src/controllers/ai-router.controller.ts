import { Request, Response } from 'express'
import { routeAI, getRouterStatus } from '../lib/ai-router'

export async function route(req: Request, res: Response): Promise<void> {
  const { prompt, task_type, system, grounded } = req.body
  if (!prompt?.trim()) { res.status(400).json({ error: 'prompt required' }); return }

  try {
    const result = await routeAI(prompt, task_type, {
      system,
      grounded: !!grounded,
      companyId: req.user.company_id,
      userId: req.user.id,
      userRole: req.user.role,
    })
    res.json(result)
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'AI routing failed' })
  }
}

export async function status(_req: Request, res: Response): Promise<void> {
  res.json(getRouterStatus())
}
