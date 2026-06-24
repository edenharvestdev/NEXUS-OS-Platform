import { Request, Response } from 'express'
import { routeAI, getRouterStatus } from '../lib/ai-router'
import { getProviderStatus, probeAllProviders } from '../lib/ai-providers'

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
  res.json({
    ...getRouterStatus(),
    providers: getProviderStatus(),
    updated_at: new Date().toISOString(),
  })
}

export async function probe(_req: Request, res: Response): Promise<void> {
  try {
    const results = await probeAllProviders()
    const working = Object.values(results).filter(r => r.ok).length
    const configured = Object.values(results).filter(r => r.configured).length
    res.json({
      results,
      summary: { working, configured, total: 4 },
      probed_at: new Date().toISOString(),
    })
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'Probe failed' })
  }
}
