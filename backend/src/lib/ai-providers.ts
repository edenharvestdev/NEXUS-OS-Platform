/**
 * NEXUS OS — unified AI providers with automatic fallback.
 * Ensures chat, OCR, meetings, contracts work when one provider is down.
 */
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { parseGeminiJSON } from './gemini-parse'
import { redactForProvider } from './ai-redaction'
import { logAiQuery, promptHash } from './ai-query-log'

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'typhoon'

export interface AIResult {
  text: string
  provider: AIProvider
  model: string
}

export interface AICallOptions {
  system?: string
  /** Try these providers first (in order), then default chain */
  prefer?: AIProvider[]
  imageBase64?: string
  mimeType?: string
  maxTokens?: number
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const TYPHOON_MODEL = process.env.TYPHOON_MODEL || 'typhoon-v2.5-30b-a3b-instruct'
const TYPHOON_URL = process.env.TYPHOON_API_URL || 'https://api.opentyphoon.ai/v1/chat/completions'

const CLAUDE_MODELS = [
  process.env.CLAUDE_MODEL,
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
].filter(Boolean) as string[]

const DEFAULT_CHAIN: AIProvider[] = ['openai', 'claude', 'gemini', 'typhoon']
const VISION_CHAIN: AIProvider[] = ['openai', 'gemini']

let geminiClient: GoogleGenerativeAI | null = null

function gemini(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY
  if (!key || key === 'your_gemini_api_key') return null
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(key)
  return geminiClient
}

export function hasProvider(provider: AIProvider): boolean {
  switch (provider) {
    case 'openai': return !!process.env.OPENAI_API_KEY
    case 'claude': return !!process.env.ANTHROPIC_API_KEY
    case 'gemini': return !!gemini()
    case 'typhoon': return !!process.env.TYPHOON_API_KEY
    default: return false
  }
}

export function anyAIConfigured(): boolean {
  return DEFAULT_CHAIN.some(hasProvider)
}

function buildChain(prefer?: AIProvider[], vision?: boolean): AIProvider[] {
  const base = vision ? VISION_CHAIN : DEFAULT_CHAIN
  if (!prefer?.length) return base.filter(hasProvider)
  const ordered = [...new Set([...prefer, ...base])]
  return ordered.filter(hasProvider)
}

async function callOpenAI(
  prompt: string,
  system?: string,
  vision?: { base64: string; mimeType: string },
  maxTokens = 2048,
): Promise<AIResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')

  const userContent: unknown = vision
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${vision.mimeType};base64,${vision.base64}` } },
      ]
    : prompt

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system || 'You are NEXUS OS AI. Answer in Thai when appropriate. Copilot, not Autopilot.' },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error')
  return {
    text: data.choices?.[0]?.message?.content || '',
    provider: 'openai',
    model: OPENAI_MODEL,
  }
}

async function callClaude(prompt: string, system?: string, maxTokens = 2048): Promise<AIResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured')

  let lastErr = 'Claude API error'
  for (const model of CLAUDE_MODELS) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: system || 'You are NEXUS OS AI — answer from organizational context. Copilot, not Autopilot.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json() as any
    if (res.ok) {
      return {
        text: data.content?.[0]?.text || '',
        provider: 'claude',
        model,
      }
    }
    lastErr = data.error?.message || lastErr
    if (res.status === 404) continue
    throw new Error(lastErr)
  }
  throw new Error(lastErr)
}

async function callGemini(
  prompt: string,
  vision?: { base64: string; mimeType: string },
): Promise<AIResult> {
  const client = gemini()
  if (!client) throw new Error('GEMINI_API_KEY not configured')
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

  if (vision) {
    const parts: Part[] = [
      { text: prompt },
      { inlineData: { data: vision.base64, mimeType: vision.mimeType as any } },
    ]
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] })
    return { text: result.response.text(), provider: 'gemini', model: GEMINI_MODEL }
  }

  const result = await model.generateContent(prompt)
  return { text: result.response.text(), provider: 'gemini', model: GEMINI_MODEL }
}

async function callTyphoon(prompt: string, system?: string, maxTokens = 2048): Promise<AIResult> {
  const key = process.env.TYPHOON_API_KEY
  if (!key) throw new Error('TYPHOON_API_KEY not configured')

  const res = await fetch(TYPHOON_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TYPHOON_MODEL,
      messages: [
        { role: 'system', content: system || 'คุณคือ NEXUS OS Typhoon Agent — ตอบภาษาไทย เน้นบริบทไทย' },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data.error?.message || data.message || 'Typhoon API error')
  return {
    text: data.choices?.[0]?.message?.content || data.message || '',
    provider: 'typhoon',
    model: TYPHOON_MODEL,
  }
}

async function callProvider(
  provider: AIProvider,
  prompt: string,
  options: AICallOptions,
): Promise<AIResult> {
  const vision = options.imageBase64 && options.mimeType
    ? { base64: options.imageBase64, mimeType: options.mimeType }
    : undefined

  if (vision && provider === 'claude') {
    throw new Error('Claude vision not enabled in router')
  }
  if (vision && provider === 'typhoon') {
    throw new Error('Typhoon vision not supported')
  }

  switch (provider) {
    case 'openai':
      return callOpenAI(prompt, options.system, vision, options.maxTokens)
    case 'claude':
      return callClaude(prompt, options.system, options.maxTokens)
    case 'gemini':
      return callGemini(prompt, vision)
    case 'typhoon':
      return callTyphoon(prompt, options.system, options.maxTokens)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/** Text or vision — tries providers until one succeeds */
export async function askWithFallback(prompt: string, options: AICallOptions = {}): Promise<AIResult> {
  if (!anyAIConfigured()) {
    throw new Error('ไม่มี AI API key — ตั้ง OPENAI_API_KEY หรือ GEMINI_API_KEY ใน nexus-api')
  }

  const chain = buildChain(options.prefer, !!(options.imageBase64 && options.mimeType))
  if (!chain.length) throw new Error('ไม่มี AI provider ที่พร้อมใช้งาน')

  // AIEG-1 egress floor. mode: 'off' (no redaction/log) | 'shadow' (log what
  // WOULD be masked, send raw — DEFAULT, no behavior change) | 'enforce' (send
  // the masked prompt). RESTRICTED-class exclusion is the broker (AIEG-2); this
  // is the content-level last line so IDs/salary never leave once enforced.
  const mode = (process.env.AI_REDACTION || 'shadow').toLowerCase()
  const red = mode === 'off' ? { text: prompt, count: 0, hits: {} } : redactForProvider(prompt)
  const outbound = mode === 'enforce' ? red.text : prompt

  const errors: string[] = []
  let result: AIResult | null = null
  for (const provider of chain) {
    try {
      result = await callProvider(provider, outbound, options)
      break
    } catch (e: any) {
      const msg = `${provider}: ${e?.message || e}`
      errors.push(msg)
      console.warn('[AI fallback]', msg)
    }
  }

  if (mode !== 'off') {
    await logAiQuery({
      provider: result?.provider,
      model: result?.model,
      redactionMode: mode,
      redactionCount: red.count,
      redactionHits: red.hits,
      restrictedAttempt: red.count > 0,
      blocked: !result,
      promptChars: prompt.length,
      promptHash: promptHash(prompt),
      responseSummary: result?.text ? result.text.slice(0, 200) : undefined,
    })
  }

  if (!result) throw new Error(`AI ทุก provider ล้มเหลว — ${errors.slice(0, 2).join(' | ')}`)
  return result
}

export async function askAIText(prompt: string, options?: AICallOptions): Promise<AIResult> {
  return askWithFallback(prompt, options)
}

export async function askAIJSON(prompt: string, options?: AICallOptions): Promise<any> {
  const jsonPrompt = `${prompt}\n\nตอบเป็น JSON เท่านั้น ไม่มี markdown code fence`
  const result = await askWithFallback(jsonPrompt, options)
  return parseGeminiJSON(result.text)
}

export async function askAIVisionJSON(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  options?: Omit<AICallOptions, 'imageBase64' | 'mimeType'>,
): Promise<any> {
  const jsonPrompt = `${prompt}\n\nตอบเป็น JSON เท่านั้น ไม่มี markdown code fence`
  const result = await askWithFallback(jsonPrompt, {
    ...options,
    imageBase64,
    mimeType,
    prefer: options?.prefer || ['openai', 'gemini'],
  })
  return parseGeminiJSON(result.text)
}

export function getProviderStatus() {
  return {
    openai: { configured: hasProvider('openai'), model: OPENAI_MODEL, label: 'OpenAI' },
    claude: { configured: hasProvider('claude'), models: CLAUDE_MODELS, model: CLAUDE_MODELS[0], label: 'Claude' },
    gemini: { configured: hasProvider('gemini'), model: GEMINI_MODEL, label: 'Gemini' },
    typhoon: { configured: hasProvider('typhoon'), model: TYPHOON_MODEL, label: 'Typhoon' },
    line: { configured: !!(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN), label: 'LINE' },
    any_configured: anyAIConfigured(),
    vision_chain: VISION_CHAIN.filter(hasProvider),
    default_chain: DEFAULT_CHAIN.filter(hasProvider),
  }
}

export type ProviderProbe = {
  configured: boolean
  ok?: boolean
  skipped?: boolean
  latency_ms?: number
  model?: string
  error?: string
}

/** Live ping — admin only (costs API tokens) */
export async function probeAllProviders(): Promise<Record<AIProvider, ProviderProbe>> {
  const all: AIProvider[] = ['openai', 'claude', 'gemini', 'typhoon']
  const out = {} as Record<AIProvider, ProviderProbe>

  for (const provider of all) {
    if (!hasProvider(provider)) {
      out[provider] = { configured: false, skipped: true }
      continue
    }
    const start = Date.now()
    try {
      const result = await callProvider(provider, 'ตอบคำเดียว: OK', { maxTokens: 8 })
      out[provider] = {
        configured: true,
        ok: true,
        latency_ms: Date.now() - start,
        model: result.model,
      }
    } catch (e: any) {
      out[provider] = {
        configured: true,
        ok: false,
        latency_ms: Date.now() - start,
        error: String(e?.message || e).slice(0, 200),
      }
    }
  }
  return out
}
