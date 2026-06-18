import fs from 'fs'
import path from 'path'

const STORAGE_ROOT = path.join(process.cwd(), 'data', 'storage')

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

export function saveFileToDisk(
  companyId: string,
  userId: string,
  fileId: string,
  filename: string,
  base64: string,
): { storagePath: string; sizeBytes: number } {
  const dir = path.join(STORAGE_ROOT, companyId, userId)
  fs.mkdirSync(dir, { recursive: true })
  const ext = path.extname(filename) || '.bin'
  const rel = path.join(companyId, userId, `${fileId}${ext}`)
  const abs = path.join(STORAGE_ROOT, rel)
  const buf = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64')
  fs.writeFileSync(abs, buf)
  return { storagePath: rel, sizeBytes: buf.length }
}

export function readFileFromDisk(storagePath: string): Buffer | null {
  const abs = path.join(STORAGE_ROOT, storagePath)
  if (!abs.startsWith(STORAGE_ROOT) || !fs.existsSync(abs)) return null
  return fs.readFileSync(abs)
}

export function deleteFileFromDisk(storagePath: string): void {
  const abs = path.join(STORAGE_ROOT, storagePath)
  if (abs.startsWith(STORAGE_ROOT) && fs.existsSync(abs)) fs.unlinkSync(abs)
}

export function getStorageStats(): { root: string; exists: boolean } {
  return { root: STORAGE_ROOT, exists: fs.existsSync(STORAGE_ROOT) }
}
