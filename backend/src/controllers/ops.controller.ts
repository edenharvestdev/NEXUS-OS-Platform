import { Request, Response } from 'express'
import { runBackup, listBackups } from '../lib/backup'
import { getQueueStats } from '../lib/job-queue'
import { getMigrationStatus } from '../lib/migrations'
import { queryAll } from '../lib/db'
import { getStorageStats } from '../lib/file-storage'

export async function triggerBackup(req: Request, res: Response): Promise<void> {
  try {
    const result = await runBackup('manual')
    res.json({ ok: true, ...result })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

export async function getBackups(req: Request, res: Response): Promise<void> {
  const data = await listBackups()
  res.json({ data })
}

export async function queueStatus(_req: Request, res: Response): Promise<void> {
  const stats = await getQueueStats()
  res.json(stats)
}

export async function migrationsStatus(_req: Request, res: Response): Promise<void> {
  const rows = await getMigrationStatus()
  res.json({ data: rows })
}

export async function slowRequests(_req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    `SELECT method, path, status_code, duration_ms, created_at
     FROM request_metrics ORDER BY created_at DESC LIMIT 50`,
    [],
  )
  res.json({ data: rows, storage: getStorageStats() })
}
