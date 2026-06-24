import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import dotenv from 'dotenv'
import { askAIText, askAIJSON, askAIVisionJSON } from './ai-providers'
import { parseGeminiJSON } from './gemini-parse'

dotenv.config()

export { parseGeminiJSON }

let genAI: GoogleGenerativeAI | null = null
let geminiModel: any = null
let geminiVisionModel: any = null

const GEMINI_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

if (GEMINI_KEY && GEMINI_KEY !== 'your_gemini_api_key') {
  genAI = new GoogleGenerativeAI(GEMINI_KEY)
  geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  geminiVisionModel = geminiModel
  console.log(`✅ Gemini AI ready (${GEMINI_MODEL})`)
} else {
  console.log('⚠️  GEMINI_API_KEY not set — text/vision will use OpenAI fallback when available')
}

/** Plain text — prefers Gemini, falls back to OpenAI/Claude */
export async function askGemini(prompt: string): Promise<string> {
  const result = await askAIText(prompt, { prefer: ['gemini', 'openai', 'claude', 'typhoon'] })
  return result.text
}

export async function askGeminiMultimodal(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const result = await askAIText(prompt, {
    prefer: ['gemini', 'openai'],
    imageBase64,
    mimeType,
  })
  return result.text
}

export async function askGeminiJSON(prompt: string): Promise<any> {
  return askAIJSON(prompt, { prefer: ['gemini', 'openai', 'claude', 'typhoon'] })
}

export async function askGeminiVisionJSON(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<any> {
  return askAIVisionJSON(prompt, imageBase64, mimeType, { prefer: ['openai', 'gemini'] })
}

// Legacy direct Gemini (used only if needed internally)
export async function askGeminiDirect(prompt: string): Promise<string> {
  if (!geminiModel) throw new Error('Gemini API key not configured')
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

export async function askGeminiMultimodalDirect(
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
