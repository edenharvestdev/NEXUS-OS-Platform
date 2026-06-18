import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const TYPHOON_API_KEY = process.env.TYPHOON_API_KEY

export async function POST(req: Request) {
  try {
    if (!TYPHOON_API_KEY) {
      return NextResponse.json({ error: 'TYPHOON_API_KEY not configured' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const promptOverride = formData.get('prompt') as string | null
    const mode = (formData.get('mode') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'ไฟล์ขนาดใหญ่เกินไป (สูงสุด 20MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64Data = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64Data}`

    let prompt = ''
    let systemPrompt = 'คุณคือผู้ช่วย AI อัจฉริยะที่เชี่ยวชาญการทำ OCR และวิเคราะห์เอกสารภาษาไทย ตอบกลับเป็น JSON เท่านั้น ห้ามมีคำอธิบายอื่น'

    if (mode === 'finance') {
      prompt = promptOverride || `วิเคราะห์ใบเสร็จนี้และสกัดข้อมูลในรูปแบบ JSON:
{
  "name": "ชื่อร้านค้าหรือบริษัท",
  "date": "วว/ดด/ปปปป",
  "total": 0.00,
  "tax": 0.00,
  "cat": "เลือกจาก: ค่าใช้จ่าย, Marketing, IT & อุปกรณ์, อาหาร, เดินทาง"
}
ตอบเฉพาะ JSON เท่านั้น`
    } else if (mode === 'guardian') {
      prompt = promptOverride || `วิเคราะห์สัญญาฉบับนี้ ค้นหาความเสี่ยงและข้อเสนอแนะในรูปแบบ JSON:
{
  "score": 0-100,
  "level": "Low/Medium/High",
  "summary": "สรุปสั้นๆ",
  "risks": [{"title": "หัวข้อ", "level": "ระดับ", "location": "ตำแหน่งในเอกสาร", "description": "รายละเอียด", "suggestion": "วิธีแก้ไข"}]
}
ตอบเฉพาะ JSON เท่านั้น`
    } else {
      prompt = promptOverride || 'สรุปเอกสารนี้เป็นภาษาไทย'
    }

    const response = await fetch('https://api.opentyphoon.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TYPHOON_API_KEY}`
      },
      body: JSON.stringify({
        model: 'typhoon-v1.5x-70b-vision-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || 'Typhoon API Error')

    let content = data.choices[0].message.content
    
    // ── Robust JSON Extraction ────────────────────────────────────
    // Typhoon sometimes wraps JSON in ```json ... ```
    if (content.includes('```')) {
      content = content.replace(/```json/g, '').replace(/```/g, '').trim()
    }

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({ result: parsed })
    } catch (e) {
      console.error('Failed to parse Typhoon JSON:', content)
      // Fallback if AI returned raw text instead of JSON
      return NextResponse.json({ result: { name: 'Error Parsing', date: '', total: 0, tax: 0, cat: 'อื่นๆ' } })
    }

  } catch (error: any) {
    console.error('OCR Route Error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Internal Server Error',
      details: error?.stack 
    }, { status: 500 })
  }
}
