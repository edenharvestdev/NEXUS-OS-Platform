import { Request, Response } from 'express'
import { getWallet, getRecommendations } from '../lib/skill-wallet'
import { writeAudit } from '../lib/audit'

export async function getAll(req: Request, res: Response): Promise<void> {
  const userId = req.query.user_id as string | undefined
  const data = await getWallet(req.user.company_id, userId)
  res.json({ data })
}

export async function getMine(req: Request, res: Response): Promise<void> {
  const data = await getWallet(req.user.company_id, req.user.id)
  const rec = await getRecommendations(req.user.company_id, req.user.id)
  res.json({ data, recommendations: rec })
}

export async function recompute(req: Request, res: Response): Promise<void> {
  await writeAudit({
    companyId: req.user.company_id,
    userId: req.user.id,
    action: 'skill_recompute',
    resource: 'skill_wallet',
  })
  res.json({ success: true, message: 'Scores update on work log approval automatically' })
}
