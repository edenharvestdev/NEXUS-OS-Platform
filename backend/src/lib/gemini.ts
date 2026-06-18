import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import dotenv from 'dotenv'
dotenv.config()

let genAI: GoogleGenerativeAI | null = null
let geminiModel: any = null
let geminiVisionModel: any = null

const GEMINI_KEY = process.env.GEMINI_API_KEY
if (GEMINI_KEY && GEMINI_KEY !== 'your_gemini_api_key') {
  genAI = new GoogleGenerativeAI(GEMINI_KEY)
  // Primary model — supports text + vision
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  // Vision alias (same model, both support multimodal)
  geminiVisionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  console.log('✅ Gemini AI ready (gemini-2.0-flash)')
} else {
  console.log('⚠️  GEMINI_API_KEY not set — AI features will use fallback responses')
}

// ── Plain text prompt ─────────────────────────────────────────────
export async function askGemini(prompt: string): Promise<string> {
  if (!geminiModel) throw new Error('Gemini API key not configured')
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

// ── Multimodal prompt (text + image/file) ─────────────────────────
export async function askGeminiMultimodal(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  if (!geminiVisionModel) throw new Error('Gemini API key not configured')
  const parts: Part[] = [
    { text: prompt },
    { inlineData: { data: imageBase64, mimeType: mimeType as any } },
  ]
  const result = await geminiVisionModel.generateContent({ contents: [{ role: 'user', parts }] })
  return result.response.text()
}

// ── JSON response (cleans markdown code fences) ───────────────────
export async function askGeminiJSON(prompt: string): Promise<any> {
  const text = await askGemini(prompt)
  return parseGeminiJSON(text)
}

// ── JSON from multimodal ──────────────────────────────────────────
export async function askGeminiVisionJSON(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<any> {
  const text = await askGeminiMultimodal(prompt, imageBase64, mimeType)
  return parseGeminiJSON(text)
}

// ── Shared JSON parser — strips code fences, handles nested JSON ──
export function parseGeminiJSON(text: string): any {
  // Remove markdown code fences
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  // Try direct parse
  try {
    return JSON.parse(clean)
  } catch {
    // Try to extract first JSON object
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {/* fall through */}
    }
    throw new Error(`Gemini did not return valid JSON: ${clean.slice(0, 300)}`)
  }
}
