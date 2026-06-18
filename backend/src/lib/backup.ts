import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { run, newId, queryAll } from './db'

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function runBackup(kind = 'manual'): Promise<{ path: string; size: number }> {
  ensureDir(BACKUP_DIR)
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const id = newId()

  if (process.env.DATABASE_URL) {
    const outPath = path.join(BACKUP_DIR, `pg-${ts}.sql`)
    try {
      execSync(`pg_dump "${process.env.DATABASE_URL}" -f "${outPath}"`, { stdio: 'pipe' })
      const stat = fs.statSync(outPath)
      await run(
        `INSERT INTO backup_records (id, kind, path, size_bytes, status) VALUES ($1,$2,$3,$4,'completed')`,
        [id, kind, outPath, stat.size],
      )
      pruneOldBackups(14)
      return { path: outPath, size: stat.size }
    } catch (e: any) {
      await run(
        `INSERT INTO backup_records (id, kind, path, size_bytes, status) VALUES ($1,$2,$3,0,'failed')`,
        [id, kind, outPath],
      )
      throw new Error(`pg_dump failed: ${e.message}`)
    }
  }

  const dbPath = path.join(process.cwd(), 'data', 'nexasos.db')
  if (!fs.existsSync(dbPath)) throw new Error('SQLite database not found')
  const outPath = path.join(BACKUP_DIR, `sqlite-${ts}.db`)
  fs.copyFileSync(dbPath, outPath)
  const stat = fs.statSync(outPath)
  await run(
    `INSERT INTO backup_records (id, kind, path, size_bytes, status) VALUES ($1,$2,$3,$4,'completed')`,
    [id, kind, outPath, stat.size],
  )
  pruneOldBackups(14)
  return { path: outPath, size: stat.size }
}

function pruneOldBackups(keepDays: number) {
  if (!fs.existsSync(BACKUP_DIR)) return
  const cutoff = Date.now() - keepDays * 86400000
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    const fp = path.join(BACKUP_DIR, f)
    try {
      if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp)
    } catch { /* ignore */ }
  }
}

export function scheduleDailyBackup(hourUtc = 2): void {
  if (process.env.VERCEL) return
  setInterval(async () => {
    const now = new Date()
    if (now.getUTCHours() === hourUtc && now.getUTCMinutes() < 5) {
      try {
        const { enqueueJob } = await import('./job-queue')
        await enqueueJob('backup', { kind: 'scheduled' })
      } catch (e) {
        console.error('Backup schedule error:', e)
      }
    }
  }, 60000)
  console.log('💾 Daily backup scheduler active')
}

export async function listBackups() {
  return queryAll('SELECT * FROM backup_records ORDER BY created_at DESC LIMIT 20', [])
}
