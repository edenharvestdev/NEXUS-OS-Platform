import { Request, Response } from 'express'
import { searchMemory, explainDrop } from '../lib/memory-search'
import { routeAI } from '../lib/ai-router'
import { buildOrgContext } from '../lib/rag-context'

export async function search(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q || '')
  const results = await searchMemory(req.user.company_id, q)
  res.json({ query: q, count: results.length, data: results })
}

export async function explain(req: Request, res: Response): Promise<void> {
  const { topic } = req.body
  if (!topic) { res.status(400).json({ error: 'topic required' }); return }
  const breadcrumbs = await explainDrop(req.user.company_id, topic)
  const context = await buildOrgContext(req.user.company_id, req.user.role)
  let aiSummary = ''
  try {
    const prompt = `อธิบายสาเหตุที่เป็นไปได้ของ "${topic}" จากข้อมูลองค์กร:\n${breadcrumbs.join('\n')}`
    const routed = await routeAI(prompt, 'analysis', {
      companyId: req.user.company_id,
      userId: req.user.id,
      userRole: req.user.role,
      grounded: true,
    })
    aiSummary = routed.response || ''
  } catch {
    aiSummary = breadcrumbs.join('\n')
  }
  res.json({ topic, breadcrumbs, ai_summary: aiSummary, context_preview: context.text.slice(0, 500) })
}
