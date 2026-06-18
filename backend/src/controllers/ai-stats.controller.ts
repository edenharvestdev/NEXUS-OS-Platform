import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

// ── GET /api/ai-stats ─────────────────────────────────────────────
export async function getStats(req: Request, res: Response): Promise<void> {
  const logs = await queryAll(
    `SELECT * FROM ai_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [req.user.company_id],
  )

  const total_tokens = logs.reduce((s, l) => s + (Number(l.tokens_used) || 0), 0)
  const total_cost   = logs.reduce((s, l) => s + (Number(l.cost_thb) || 0), 0)
  const total_actions = logs.length

  // Aggregate by agent
  const by_agent: Record<string, { count: number; tokens: number; cost: number }> = {}
  for (const l of logs) {
    if (!by_agent[l.agent]) by_agent[l.agent] = { count: 0, tokens: 0, cost: 0 }
    by_agent[l.agent].count++
    by_agent[l.agent].tokens += Number(l.tokens_used) || 0
    by_agent[l.agent].cost   += Number(l.cost_thb) || 0
  }

  // Daily usage (last 7 days)
  const daily: Record<string, { tokens: number; cost: number; count: number }> = {}
  for (const l of logs) {
    const day = (l.created_at as string)?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    if (!daily[day]) daily[day] = { tokens: 0, cost: 0, count: 0 }
    daily[day].tokens += Number(l.tokens_used) || 0
    daily[day].cost   += Number(l.cost_thb) || 0
    daily[day].count++
  }

  res.json({
    data: {
      total_actions,
      total_tokens,
      total_cost: parseFloat(total_cost.toFixed(4)),
      by_agent,
      daily,
      logs: logs.slice(0, 50), // only return latest 50 for display
    },
  })
}
