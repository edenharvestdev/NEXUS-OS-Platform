import { Request, Response } from 'express'
import { queryOne } from '../lib/db'

/** L6 Organization Health Score — computed from available data with assumptions noted */
export async function getHealthScore(req: Request, res: Response): Promise<void> {
  const cid = req.user.company_id

  const people = await queryOne(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
       AVG(CASE WHEN leave_total > 0 THEN CAST(leave_used AS REAL) / leave_total ELSE 0 END) as leave_ratio
     FROM users WHERE company_id = $1`,
    [cid],
  ) || { total: 0, active: 0, leave_ratio: 0 }

  const tasks = await queryOne(
    `SELECT COUNT(*) as total, SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as done FROM tasks WHERE company_id = $1`,
    [cid],
  ) || { total: 0, done: 0 }

  const finance = await queryOne(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' AND status = 'approved' THEN amount ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'approved' THEN amount ELSE 0 END), 0) as expense
     FROM transactions WHERE company_id = $1`,
    [cid],
  ) || { income: 0, expense: 0 }

  const customer = await queryOne(
    `SELECT COUNT(*) as deals, AVG(probability) as avg_prob FROM deals WHERE company_id = $1 AND deleted_at IS NULL`,
    [cid],
  ) || { deals: 0, avg_prob: 0 }

  const peopleScore = clamp(
    (num(people.active) / Math.max(num(people.total), 1)) * 70 +
    (1 - Math.min(num(people.leave_ratio), 1)) * 30,
  )
  const operationScore = clamp(
    num(tasks.total) > 0 ? (num(tasks.done) / num(tasks.total)) * 100 : 65,
  )
  const income = num(finance.income)
  const expense = num(finance.expense)
  const margin = income > 0 ? (income - expense) / income : 0
  const financeScore = clamp(50 + margin * 50)
  const customerScore = clamp(num(customer.avg_prob) || 50)

  const overall = Math.round((peopleScore + operationScore + financeScore + customerScore) / 4)

  res.json({
    organization_health_score: overall,
    dimensions: {
      people: { score: Math.round(peopleScore), label: 'People' },
      operation: { score: Math.round(operationScore), label: 'Operation' },
      finance: { score: Math.round(financeScore), label: 'Finance' },
      customer: { score: Math.round(customerScore), label: 'Customer' },
    },
    daily_readiness: overall >= 70 ? 'ready' : overall >= 50 ? 'caution' : 'at_risk',
    assumptions: [
      'Scores derived from active users, task completion, approved transactions, and deal pipeline.',
      'Early-stage simulation — not statistical probability until sufficient historical data.',
    ],
    updated_at: new Date().toISOString(),
  })
}

export async function simulateFeasibility(req: Request, res: Response): Promise<void> {
  const { scenario = 'new_branch', investment = 500000, monthly_revenue = 800000 } = req.body || {}
  const health = await queryOne(
    `SELECT AVG(probability) as avg_prob FROM deals WHERE company_id = $1 AND deleted_at IS NULL`,
    [req.user.company_id],
  )
  const base = num(health?.avg_prob) || 55
  const roiMonths = Number(investment) / Math.max(Number(monthly_revenue) * 0.2, 1)
  const successPct = clamp(base - Math.min(roiMonths, 24) * 1.5 + 10)

  res.json({
    scenario,
    success_probability_pct: Math.round(successPct),
    confidence_range: [Math.max(0, Math.round(successPct - 15)), Math.min(100, Math.round(successPct + 10))],
    assumptions: [
      `Investment ฿${Number(investment).toLocaleString()}, projected monthly revenue ฿${Number(monthly_revenue).toLocaleString()}`,
      'Based on current pipeline probability and simplified ROI model.',
      'Not a guarantee — human decision required (Decision Rights L3).',
    ],
  })
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}
