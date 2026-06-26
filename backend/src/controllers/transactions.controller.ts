import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

// ── GET /api/transactions ─────────────────────────────────────────
export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM transactions WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id],
  )
  res.json({ data })
}

// ── POST /api/transactions ────────────────────────────────────────
export async function create(req: Request, res: Response): Promise<void> {
  const { description, desc, amount, type, category, cat, date, status } = req.body
  const finalDesc = description || desc
  if (!finalDesc || !amount || !type) {
    res.status(400).json({ error: 'description, amount, type จำเป็น' }); return
  }
  if (!['income', 'expense'].includes(type)) {
    res.status(400).json({ error: 'type ต้องเป็น income หรือ expense' }); return
  }

  const id = newId()
  await run(
    `INSERT INTO transactions (id,company_id,user_id,description,amount,type,category,status,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id, req.user.company_id, req.user.id,
      finalDesc, Number(amount), type,
      category || cat || 'ค่าใช้จ่าย',
      status || 'pending',
      date || new Date().toISOString().slice(0, 10),
    ],
  )
  const data = await queryOne('SELECT * FROM transactions WHERE id = $1', [id])
  res.json({ data })
}

// ── PATCH /api/transactions/:id ───────────────────────────────────
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { status } = req.body
  if (!status) { res.status(400).json({ error: 'status จำเป็น' }); return }

  const tx = await queryOne(
    'SELECT id FROM transactions WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id],
  )
  if (!tx) { res.status(404).json({ error: 'Transaction not found' }); return }

  await run(
    'UPDATE transactions SET status = $1 WHERE id = $2 AND company_id = $3',
    [status, id, req.user.company_id],
  )
  const data = await queryOne('SELECT * FROM transactions WHERE id = $1', [id])
  res.json({ data })
}

// ── POST /api/transactions/ocr ───────────────────────────────────
export async function ocrReceipt(req: Request, res: Response): Promise<void> {
  const { fileBase64, fileMime } = req.body
  if (!fileBase64) { res.status(400).json({ error: 'fileBase64 is required' }); return }

  const prompt = `วิเคราะห์ใบเสร็จนี้และสกัดข้อมูลในรูปแบบ JSON:
{
  "name": "ชื่อร้านค้าหรือบริษัท",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "tax": 0.00,
  "cat": "เลือกจาก: ค่าใช้จ่าย, Marketing, IT & อุปกรณ์, อาหาร, เดินทาง"
}
ตอบเฉพาะ JSON เท่านั้น`

  try {
    const { askAIVisionJSON } = await import('../lib/ai-providers')
    const result = await askAIVisionJSON(prompt, fileBase64, fileMime || 'image/jpeg', { prefer: ['openai', 'gemini'], dataClass: 'RESTRICTED', taskType: 'finance' })
    await run(
      `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb)
       VALUES ($1,$2,$3,'Finance OCR','สแกนใบเสร็จ',500,0.15)`,
      [newId(), req.user.company_id, req.user.id],
    )
    res.json({ result })
  } catch (e) {
    res.status(503).json({ error: (e as Error).message || 'OCR unavailable — configure OPENAI_API_KEY or GEMINI_API_KEY' })
  }
}

// ── GET /api/transactions/export/csv ─────────────────────────────
export async function exportCSV(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT date, description, amount, type, category, status FROM transactions WHERE company_id = $1 ORDER BY date DESC',
    [req.user.company_id],
  )

  const header = 'Date,Description,Amount,Type,Category,Status\n'
  const csv = data.map((t: any) => {
    // Escape quotes and handle commas
    const desc = `"${(t.description || '').replace(/"/g, '""')}"`
    const cat = `"${(t.category || '').replace(/"/g, '""')}"`
    return `${t.date},${desc},${t.amount},${t.type},${cat},${t.status}`
  }).join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=nexasos-export-${new Date().toISOString().slice(0, 10)}.csv`)
  res.send('\uFEFF' + header + csv) // BOM for Excel Thai characters
}

// ── DELETE /api/transactions/:id ──────────────────────────────────
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const tx = await queryOne(
    'SELECT id FROM transactions WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id],
  )
  if (!tx) { res.status(404).json({ error: 'Transaction not found' }); return }
  await run(
    'DELETE FROM transactions WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id],
  )
  res.json({ success: true })
}
