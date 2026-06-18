import { queryAll, queryOne, run, newId } from './db'

export type JobType = 'notification_delivery' | 'backup' | 'sla_escalation' | 'monthly_skill_review'

export async function enqueueJob(type: JobType, payload: Record<string, unknown>, delayMs = 0): Promise<string> {
  const id = newId()
  const runAfter = new Date(Date.now() + delayMs).toISOString()
  await run(
    `INSERT INTO job_queue (id, job_type, payload, run_after) VALUES ($1,$2,$3,$4)`,
    [id, type, JSON.stringify(payload), runAfter],
  )
  return id
}

async function claimNextJob() {
  const job = await queryOne(
    `SELECT * FROM job_queue WHERE status = 'pending' AND run_after <= $1
     ORDER BY created_at ASC LIMIT 1`,
    [new Date().toISOString()],
  )
  if (!job) return null
  await run(
    `UPDATE job_queue SET status = 'processing', attempts = attempts + 1, updated_at = $1 WHERE id = $2 AND status = 'pending'`,
    [new Date().toISOString(), job.id],
  )
  return job
}

async function completeJob(id: string, failed = false, error?: string) {
  if (failed) {
    const job = await queryOne('SELECT attempts, max_attempts FROM job_queue WHERE id = $1', [id])
    const dead = Number(job?.attempts || 0) >= Number(job?.max_attempts || 3)
    await run(
      `UPDATE job_queue SET status = $1, last_error = $2, updated_at = $3,
       run_after = $4 WHERE id = $5`,
      [
        dead ? 'dead' : 'pending',
        error || 'unknown',
        new Date().toISOString(),
        new Date(Date.now() + 60000).toISOString(),
        id,
      ],
    )
  } else {
    await run(
      `UPDATE job_queue SET status = 'done', updated_at = $1 WHERE id = $2`,
      [new Date().toISOString(), id],
    )
  }
}

async function processJob(job: any): Promise<void> {
  const payload = JSON.parse(job.payload || '{}')
  switch (job.job_type as JobType) {
    case 'notification_delivery': {
      const { deliverNotification } = await import('./delivery')
      await deliverNotification(payload)
      break
    }
    case 'backup': {
      const { runBackup } = await import('./backup')
      await runBackup(payload.kind as string || 'scheduled')
      break
    }
    case 'sla_escalation': {
      const { processEscalations } = await import('./sla-escalation')
      await processEscalations()
      break
    }
    case 'monthly_skill_review': {
      const { processMonthlySkillReview } = await import('./monthly-task-agent')
      await processMonthlySkillReview()
      break
    }
    default:
      throw new Error(`Unknown job type: ${job.job_type}`)
  }
}

let workerRunning = false

export async function processJobQueue(): Promise<number> {
  if (workerRunning) return 0
  workerRunning = true
  let processed = 0
  try {
    for (let i = 0; i < 10; i++) {
      const job = await claimNextJob()
      if (!job) break
      try {
        await processJob(job)
        await completeJob(job.id, false)
        processed++
      } catch (e: any) {
        await completeJob(job.id, true, e?.message || String(e))
      }
    }
  } finally {
    workerRunning = false
  }
  return processed
}

export function startJobWorker(intervalMs = 5000): void {
  if (process.env.VERCEL) return
  setInterval(() => {
    processJobQueue().catch(err => console.error('Job worker error:', err))
  }, intervalMs)
  console.log('⚙️  Job queue worker started')
}

export async function getQueueStats() {
  const rows = await queryAll(
    `SELECT status, COUNT(*) as c FROM job_queue GROUP BY status`,
    [],
  )
  const dead = await queryAll(
    `SELECT id, job_type, last_error, attempts FROM job_queue WHERE status = 'dead' ORDER BY updated_at DESC LIMIT 10`,
    [],
  )
  return { counts: rows, dead_letter: dead }
}
