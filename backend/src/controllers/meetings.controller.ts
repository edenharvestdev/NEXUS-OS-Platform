import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

// ── Fallback when Gemini unavailable ─────────────────────────────
const fallbackMeeting = (title: string) => ({
  summary: `• ทีมงานได้หารือประเด็นสำคัญในการประชุม "${title}"\n• มีการวางแผนกลยุทธ์ระยะสั้นและระยะยาว\n• ที่ประชุมมีมติร่วมกันในการดำเนินงานตามแผน`,
  decisions: ['ดำเนินการตามแผนที่วางไว้', 'ติดตามความคืบหน้าในสัปดาห์ถัดไป'],
  actions: [
    { task: 'ติดตามผลการประชุม', assigned_to: 'ทีมงาน', due_date: 'ภายใน 1 สัปดาห์', priority: 'high' },
  ],
  sentiment: 'positive',
  participants: 5,
  duration_minutes: 60,
})

// ── Try Gemini with optional vision ─────────────────────────────
async function tryGeminiJSON(
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
    console.warn('Gemini meeting fallback:', (e as Error).message)
    return null // signal to use fallback
  }
}

// ── GET /api/meetings ─────────────────────────────────────────────
export async function getAll(req: Request, res: Response): Promise<void> {
  const meetings = await queryAll(
    'SELECT * FROM meetings WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id],
  )
  const data = await Promise.all(
    meetings.map(async m => ({
      ...m,
      decisions:
        typeof m.decisions === 'string'
          ? JSON.parse(m.decisions || '[]')
          : m.decisions || [],
      action_items: await queryAll(
        'SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC',
        [m.id],
      ),
    })),
  )
  res.json({ data })
}

// ── POST /api/meetings/analyze ───────────────────────────────────
// Accepts: title, transcript (text), fileBase64, fileMime
export async function analyze(req: Request, res: Response): Promise<void> {
  const { title, transcript, fileBase64, fileMime } = req.body
  if (!title) { res.status(400).json({ error: 'title is required' }); return }
  const { company_id, id: user_id } = req.user

  const prompt = `คุณคือผู้เชี่ยวชาญด้านการจดบันทึกการประชุมและวิเคราะห์ธุรกิจ
สรุปการประชุม "${title}" อย่างละเอียด ครอบคลุมทุกประเด็น

ตอบเป็น JSON ดังนี้ (ภาษาไทย):
{
  "summary": "สรุปประเด็นสำคัญ 3-5 ข้อ ขึ้นต้นแต่ละข้อด้วย •",
  "decisions": ["การตัดสินใจข้อ 1", "การตัดสินใจข้อ 2"],
  "actions": [
    {"task": "งานที่ต้องทำ", "assigned_to": "ชื่อผู้รับผิดชอบ", "due_date": "วันที่กำหนด", "priority": "high"}
  ],
  "sentiment": "positive",
  "participants": 5,
  "duration_minutes": 60
}

priority ต้องเป็น: high, medium, หรือ low
sentiment ต้องเป็น: positive, neutral, หรือ negative

${transcript ? `เนื้อหาการประชุม:\n${transcript}` : ''}`

  const result = (await tryGeminiJSON(prompt, fileBase64, fileMime)) || fallbackMeeting(title)

  const meeting_id = newId()
  await run(
    `INSERT INTO meetings (id,company_id,user_id,title,summary,decisions,sentiment,duration_minutes,participants)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      meeting_id, company_id, user_id, title,
      result.summary || '',
      JSON.stringify(result.decisions || []),
      result.sentiment || 'neutral',
      Number(result.duration_minutes) || 60,
      Number(result.participants) || 1,
    ],
  )

  const actions = Array.isArray(result.actions) ? result.actions : []
  for (const a of actions) {
    await run(
      `INSERT INTO action_items (id,meeting_id,company_id,task,assigned_to,due_date,priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        newId(), meeting_id, company_id,
        a.task || 'ติดตามผล',
        a.assigned_to || 'ทีมงาน',
        a.due_date || '',
        (['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium'),
      ],
    )
  }

  await run(
    `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb)
     VALUES ($1,$2,$3,'Meeting Brain',$4,800,0.24)`,
    [newId(), company_id, user_id, `สรุปประชุม: ${title}`],
  )

  const meeting = await queryOne('SELECT * FROM meetings WHERE id = $1', [meeting_id])
  const action_items = await queryAll(
    'SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC',
    [meeting_id],
  )

  res.json({
    data: {
      ...meeting,
      decisions: result.decisions || [],
      action_items,
    },
  })
}

// ── PATCH /api/meetings/action/:id ────────────────────────────────
export async function toggleAction(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const item = await queryOne('SELECT done FROM action_items WHERE id = $1', [id])
  if (!item) { res.status(404).json({ error: 'Action item not found' }); return }
  const newDone = item.done ? 0 : 1
  await run('UPDATE action_items SET done = $1 WHERE id = $2', [newDone, id])
  res.json({ success: true, done: newDone === 1 })
}

// ── PATCH /api/meetings/:id ───────────────────────────────────────
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { title, summary, decisions } = req.body

  const meeting = await queryOne('SELECT id FROM meetings WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!meeting) { res.status(404).json({ error: 'Meeting not found' }); return }

  await run(
    'UPDATE meetings SET title = $1, summary = $2, decisions = $3 WHERE id = $4 AND company_id = $5',
    [
      title || '',
      summary || '',
      JSON.stringify(decisions || []),
      id,
      req.user.company_id
    ]
  )
  res.json({ success: true })
}
