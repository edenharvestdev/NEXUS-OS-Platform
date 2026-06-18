import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM deals WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id]
  )
  res.json({ data })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name, value, stage, probability, contact, email, phone, notes } = req.body
  if (!name) { res.status(400).json({ error: 'name จำเป็น' }); return }
  const id = newId()
  await run(
    `INSERT INTO deals (id,company_id,user_id,name,value,stage,probability,contact,email,phone,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, req.user.company_id, req.user.id, name,
     Number(value)||0, stage||'ติดต่อ', Number(probability)||50,
     contact||'', email||'', phone||'', notes||'']
  )
  const data = await queryOne('SELECT * FROM deals WHERE id = $1', [id])
  res.json({ data })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const fields = ['name','value','stage','probability','contact','email','phone','notes']
  const updates: string[] = []
  const vals: any[] = []
  let i = 1
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); vals.push(req.body[f]) }
  }
  updates.push(`updated_at = $${i++}`)
  vals.push(new Date().toISOString())
  vals.push(id, req.user.company_id)
  await run(`UPDATE deals SET ${updates.join(', ')} WHERE id = $${i++} AND company_id = $${i}`, vals)
  const data = await queryOne('SELECT * FROM deals WHERE id = $1', [id])
  res.json({ data })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  await run('DELETE FROM deals WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}

// ── POST /api/deals/:id/analyze ──────────────────────────────────
export async function analyzeLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const deal = await queryOne('SELECT * FROM deals WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!deal) { res.status(404).json({ error: 'ไม่พบข้อมูลดีล' }); return }

  const prompt = `คุณคือผู้เชี่ยวชาญด้านการขาย (Sales Strategist)
วิเคราะห์ดีลงานขายนี้:
ชื่อดีล: ${deal.name}
มูลค่า: ${deal.value}
ขั้นตอน: ${deal.stage}
โอกาสปิดการขาย: ${deal.probability}%
ติดต่อ: ${deal.contact}
บันทึก: ${deal.notes}

ให้ประเมินในหัวข้อ:
1. โอกาสปิดการขายจริง (Realistic Probability)
2. อุปสรรคที่อาจเกิดขึ้น
3. กลยุทธ์ในการปิดการขาย (Closing Strategy)
4. สิ่งที่ควรทำต่อไป (Next Best Action)

ตอบเป็น JSON:
{
  "score": 85,
  "summary": "สรุปสั้นๆ",
  "strategies": ["กลยุทธ์ 1", "กลยุทธ์ 2"],
  "risks": ["ความเสี่ยง 1"],
  "next_action": "งานที่ควรทำทันที"
}`

  try {
    const { askGeminiJSON } = await import('../lib/gemini')
    const result = await askGeminiJSON(prompt)
    
    // Log AI usage
    await run(
      `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb)
       VALUES ($1,$2,$3,'Sales AI','วิเคราะห์ดีล: ${deal.name}',500,0.15)`,
      [newId(), req.user.company_id, req.user.id]
    )

    res.json({ data: result })
  } catch (e) {
    res.status(500).json({ error: 'AI วิเคราะห์ล้มเหลว' })
  }
}
