import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

// ── Fallback result when AI is unavailable (dev only) ─────────────
const fallbackResult = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Gemini API key not configured')
  }
  return {
    score: 65,
    level: 'medium' as string,
    summary: 'เอกสารฉบับนี้มีเนื้อหาครบถ้วน ควรตรวจสอบเงื่อนไขก่อนลงนาม (demo mode)',
    risks: [
      {
        level: 'medium',
        title: 'เงื่อนไขการยกเลิก',
        location: 'หน้า 2',
        description: 'ควรตรวจสอบเงื่อนไขการยกเลิกสัญญาอย่างละเอียด',
        suggestion: 'ปรึกษาทนายความก่อนลงนาม',
      },
    ],
  }
}

// ── Try Gemini JSON — text or vision ─────────────────────────────
async function tryGeminiVisionJSON(
  prompt: string,
  imageBase64?: string,
  mimeType?: string,
): Promise<any> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('no key')
    if (imageBase64 && mimeType) {
      const { askGeminiVisionJSON } = await import('../lib/gemini')
      return await askGeminiVisionJSON(prompt, imageBase64, mimeType)
    }
    const { askGeminiJSON } = await import('../lib/gemini')
    return await askGeminiJSON(prompt)
  } catch (e) {
    console.warn('Gemini doc analysis fallback:', (e as Error).message)
    return fallbackResult()
  }
}

// ── GET /api/documents ────────────────────────────────────────────
export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM documents WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id],
  )
  const parsed = data.map(d => ({
    ...d,
    risks: typeof d.risks === 'string' ? JSON.parse(d.risks || '[]') : (d.risks || []),
  }))
  res.json({ data: parsed })
}

// ── POST /api/documents/analyze ──────────────────────────────────
// Accepts: name, content (text), fileBase64, fileMime, fileSize
export async function analyze(req: Request, res: Response): Promise<void> {
  const { name, content, fileBase64, fileMime, fileSize } = req.body
  if (!name) { res.status(400).json({ error: 'name is required' }); return }

  const { company_id, id: user_id } = req.user

  const prompt = `คุณคือนักกฎหมายและผู้เชี่ยวชาญด้านสัญญาและเอกสารธุรกิจ
วิเคราะห์เอกสาร "${name}" อย่างละเอียดรอบคอบ ค้นหา:
• ความเสี่ยงทางกฎหมาย และข้อบกพร่องในสัญญา
• เงื่อนไขที่อาจเป็นอันตรายหรือไม่ชัดเจน
• ประเด็นที่ต้องแก้ไขหรือเพิ่มเติม
• ข้อเสนอแนะเพื่อปรับปรุงเอกสาร

ให้คะแนนความปลอดภัยโดยรวม (score: 0-100, ยิ่งสูงยิ่งปลอดภัย)
ตอบเป็น JSON:
{"score":75,"level":"low","summary":"สรุปเนื้อหาและผลการวิเคราะห์","risks":[{"level":"high","title":"ชื่อความเสี่ยง","location":"หน้า 1 ข้อ 3","description":"อธิบายความเสี่ยง","suggestion":"คำแนะนำแก้ไข"}]}

${content ? `เนื้อหาเอกสาร:\n${content}` : ''}`

  const result = await tryGeminiVisionJSON(prompt, fileBase64, fileMime)

  // Normalize risk levels
  const risks = (result.risks || []).map((r: any) => ({
    level: r.level || 'medium',
    title: r.title || 'ประเด็นที่ควรตรวจสอบ',
    location: r.location || r.loc || 'ไม่ระบุตำแหน่ง',
    description: r.description || r.desc || '',
    suggestion: r.suggestion || '',
    resolved: false,
  }))

  const id = newId()
  const riskScore = Math.max(0, Math.min(100, Number(result.score) || 50))
  const riskLevel = result.level || (riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low')

  await run(
    `INSERT INTO documents (id,company_id,user_id,name,size,status,risk_score,risk_level,summary,risks)
     VALUES ($1,$2,$3,$4,$5,'analyzed',$6,$7,$8,$9)`,
    [id, company_id, user_id, name,
     fileSize || '—',
     riskScore, riskLevel,
     result.summary || 'วิเคราะห์เสร็จสมบูรณ์',
     JSON.stringify(risks)],
  )

  // Log AI usage
  await run(
    `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb)
     VALUES ($1,$2,$3,'Doc Guardian',$4,600,0.18)`,
    [newId(), company_id, user_id, `วิเคราะห์: ${name}`],
  )

  const data = await queryOne('SELECT * FROM documents WHERE id = $1', [id])
  res.json({
    data: {
      ...data,
      risks: typeof data.risks === 'string' ? JSON.parse(data.risks || '[]') : (data.risks || []),
    },
  })
}

// ── DELETE /api/documents/:id ─────────────────────────────────────
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const doc = await queryOne('SELECT id FROM documents WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return }
  await run('DELETE FROM documents WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}

// ── PATCH /api/documents/:id/risks ───────────────────────────────
export async function updateRisks(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { risks } = req.body
  if (!risks) { res.status(400).json({ error: 'risks data is required' }); return }

  const doc = await queryOne('SELECT id FROM documents WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return }

  await run(
    'UPDATE documents SET risks = $1 WHERE id = $2 AND company_id = $3',
    [JSON.stringify(risks), id, req.user.company_id]
  )
  res.json({ success: true })
}
