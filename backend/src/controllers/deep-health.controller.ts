import { Request, Response } from 'express'
import { queryOne } from '../lib/db'
import { getQueueStats } from '../lib/job-queue'
import { getMigrationStatus } from '../lib/migrations'
import { getStorageStats } from '../lib/file-storage'
import { auditWriteFailures } from '../lib/audit'

export async function deepHealth(_req: Request, res: Response): Promise<void> {
  const core: Record<string, { ok: boolean; detail?: string }> = {}
  const optional: Record<string, { ok: boolean; detail?: string; configured: boolean }> = {}

  try {
    await queryOne('SELECT 1 as ok', [])
    core.database = { ok: true }
  } catch (e: any) {
    core.database = { ok: false, detail: e.message }
  }

  try {
    const migrations = await getMigrationStatus()
    core.migrations = { ok: true, detail: `${migrations.length} applied` }
  } catch (e: any) {
    core.migrations = { ok: false, detail: e.message }
  }

  try {
    const queue = await getQueueStats()
    const dead = (queue.dead_letter as any[])?.length || 0
    core.job_queue = { ok: dead === 0, detail: dead ? `${dead} dead jobs` : 'healthy' }
  } catch (e: any) {
    core.job_queue = { ok: false, detail: e.message }
  }

  const storage = getStorageStats()
  core.file_storage = { ok: true, detail: storage.root }

  // Audit pipeline health — non-zero means audit writes are failing silently.
  core.audit = {
    ok: auditWriteFailures === 0,
    detail: auditWriteFailures === 0 ? 'healthy' : `${auditWriteFailures} write failures`,
  }

  const emailConfigured = !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST)
  optional.email = {
    configured: emailConfigured,
    ok: emailConfigured,
    detail: process.env.RESEND_API_KEY ? 'resend' : process.env.SMTP_HOST ? 'smtp' : 'dev_log only',
  }

  const lineConfigured = !!process.env.LINE_CHANNEL_ACCESS_TOKEN
  optional.line = {
    configured: lineConfigured,
    ok: lineConfigured,
    detail: lineConfigured ? 'configured' : 'not configured',
  }

  const coreOk = Object.values(core).every(c => c.ok)
  res.status(coreOk ? 200 : 503).json({
    status: coreOk ? 'healthy' : 'degraded',
    checks: { ...core, ...optional },
    core,
    optional,
    ts: new Date().toISOString(),
  })
}
