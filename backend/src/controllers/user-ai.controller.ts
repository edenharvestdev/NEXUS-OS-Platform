import { Request, Response } from 'express'
import { queryAll, run, newId } from '../lib/db'
import { saveFileToDisk, readFileFromDisk, deleteFileFromDisk } from '../lib/file-storage'
import { writeAudit } from '../lib/audit'

const MAX_FILE_BYTES = 3 * 1024 * 1024

export async function listFiles(req: Request, res: Response): Promise<void> {
  const targetUser = (req.query.user_id as string) || req.user.id
  const isAdmin = (req.user.role || '').toLowerCase() === 'admin'
  const isHr = (req.user.role || '').toLowerCase() === 'hr'
  if (targetUser !== req.user.id && !isAdmin && !isHr) {
    res.status(403).json({ error: 'ดูได้เฉพาะไฟล์ของตัวเอง' })
    return
  }
  const data = await queryAll(
    `SELECT id, name, mime_type, size_bytes, security_tier, department, storage_path, created_at
     FROM user_files WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
    [req.user.company_id, targetUser],
  )
  res.json({ data })
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  const { name, mime_type, content_base64, security_tier } = req.body
  if (!name || !content_base64) {
    res.status(400).json({ error: 'name และ content_base64 จำเป็น' })
    return
  }
  const size = Math.ceil((content_base64.length * 3) / 4)
  if (size > MAX_FILE_BYTES) {
    res.status(400).json({ error: 'ไฟล์ใหญ่เกิน 3MB' })
    return
  }
  const id = newId()
  const tier = security_tier || 'T1'
  const { storagePath, sizeBytes } = saveFileToDisk(
    req.user.company_id,
    req.user.id,
    id,
    name,
    content_base64,
  )
  await run(
    `INSERT INTO user_files (id, company_id, user_id, department, name, mime_type, size_bytes, content_base64, storage_path, security_tier)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id, req.user.company_id, req.user.id, req.user.department || null,
      name, mime_type || 'application/octet-stream', sizeBytes, null,
      storagePath, tier,
    ],
  )
  res.status(201).json({ id, name, size_bytes: sizeBytes, storage_path: storagePath })
}

export async function getFile(req: Request, res: Response): Promise<void> {
  const row = await queryAll(
    'SELECT * FROM user_files WHERE id = $1 AND company_id = $2',
    [String(req.params.id), req.user.company_id],
  )
  const file = row[0]
  if (!file) { res.status(404).json({ error: 'Not found' }); return }
  const isAdmin = (req.user.role || '').toLowerCase() === 'admin'
  if (file.user_id !== req.user.id && !isAdmin) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (file.security_tier === 'T3' || file.security_tier === 'T2') {
    await writeAudit({
      companyId: req.user.company_id,
      userId: req.user.id,
      action: 'view',
      resource: 'user_file',
      resourceId: file.id,
      securityTier: file.security_tier,
      meta: { name: file.name },
    })
  }

  let content_base64 = file.content_base64
  if (file.storage_path) {
    const buf = readFileFromDisk(file.storage_path)
    if (buf) content_base64 = buf.toString('base64')
  }
  res.json({ data: { ...file, content_base64 } })
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const rows = await queryAll(
    'SELECT user_id, storage_path FROM user_files WHERE id = $1 AND company_id = $2',
    [String(req.params.id), req.user.company_id],
  )
  const file = rows[0]
  if (!file) { res.status(404).json({ error: 'Not found' }); return }
  if (file.user_id !== req.user.id && (req.user.role || '').toLowerCase() !== 'admin') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  if (file.storage_path) deleteFileFromDisk(file.storage_path)
  await run('DELETE FROM user_files WHERE id = $1', [String(req.params.id)])
  res.json({ success: true })
}

export async function listMemory(req: Request, res: Response): Promise<void> {
  const targetUser = (req.query.user_id as string) || req.user.id
  const isAdmin = (req.user.role || '').toLowerCase() === 'admin'
  if (targetUser !== req.user.id && !isAdmin) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const data = await queryAll(
    `SELECT id, memory_key, content, created_at FROM user_ai_memory
     WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 50`,
    [req.user.company_id, targetUser],
  )
  res.json({ data })
}
