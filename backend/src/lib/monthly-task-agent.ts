import { queryAll } from './db'
import { recommendEmployees } from './task-matching'
import { getManagerRecipients, createAndDeliverNotification } from './notifications'

/** ส่ง Skill Match รายเดือนให้หัวหน้าแผนก */
export async function processMonthlySkillReview(): Promise<number> {
  const companies = await queryAll('SELECT id FROM companies', [])
  let count = 0
  const period = new Date().toISOString().slice(0, 7)

  for (const co of companies) {
    const depts = await queryAll(
      `SELECT DISTINCT department FROM users
       WHERE company_id = $1 AND status = 'active' AND department IS NOT NULL AND department != ''`,
      [co.id],
    )

    for (const row of depts) {
      const dept = row.department as string
      const recs = await recommendEmployees({ companyId: co.id, department: dept, limit: 5 })
      if (!recs.length) continue

      const summary = recs.slice(0, 3).map(r => `${r.name} (${Math.round(r.match_score)}%)`).join(', ')
      const managers = await getManagerRecipients(co.id, dept)

      for (const m of managers) {
        await createAndDeliverNotification({
          companyId: co.id,
          userId: m.id,
          type: 'monthly_skill_review',
          title: `📊 Skill Match รายเดือน — ${dept}`,
          body: `แนะนำมอบหมายงาน (${period}): ${summary}`,
          meta: { department: dept, period, top_matches: recs.slice(0, 5) },
        })
        count++
      }
    }
  }
  return count
}

export function scheduleMonthlySkillReview(dayOfMonth = 1, hourUtc = 3): void {
  if (process.env.VERCEL) return
  setInterval(async () => {
    const now = new Date()
    if (now.getUTCDate() === dayOfMonth && now.getUTCHours() === hourUtc && now.getUTCMinutes() < 5) {
      try {
        const { enqueueJob } = await import('./job-queue')
        await enqueueJob('monthly_skill_review', {})
      } catch (e) {
        console.error('Monthly skill review schedule error:', e)
      }
    }
  }, 60000)
  console.log('📊 Monthly Skill Match scheduler active')
}
