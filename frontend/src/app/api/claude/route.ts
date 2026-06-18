import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { system, message } = await req.json()
    const res = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: system || 'คุณคือ AI Assistant ของ Autosoft ตอบเป็นภาษาไทย กระชับและมีประโยชน์',
      messages: [{ role: 'user', content: message }],
    })
    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    return NextResponse.json({ text })
  } catch (e) {
    return NextResponse.json({ error: 'API Error' }, { status: 500 })
  }
}
