/**
 * AIEG-1 — AI egress redaction FLOOR. The last line of defense before any prompt
 * leaves to an external provider (OpenAI / Anthropic / Gemini / Typhoon): mask
 * the highest-risk sensitive tokens (national IDs, contact info, money/salary,
 * long account numbers) so they can never appear in an outbound prompt.
 *
 * This is a content-level floor. Class-level exclusion of RESTRICTED rows from
 * the prompt is the AI Data Broker (AIEG-2) — this floor is defense-in-depth
 * that runs regardless. Ordering matters (specific patterns before the generic
 * long-digit catch-all).
 */

type Pattern = { name: string; re: RegExp; mask: string }

const PATTERNS: Pattern[] = [
  // Email
  { name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, mask: '[REDACTED_EMAIL]' },
  // Thai national ID — 13 digits, optionally separated (x-xxxx-xxxxx-xx-x)
  { name: 'thai_id', re: /\b\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d\b/g, mask: '[REDACTED_ID]' },
  // Money / salary amounts: ฿1,234 / 1,234 บาท / THB 1234 / salary: 25000
  { name: 'money', re: /(?:฿|บาท|thb)\s?\d[\d,]*(?:\.\d+)?|(?:เงินเดือน|salary|payroll|payslip|ค่าจ้าง)\s*[:=]?\s*\d[\d,]*/gi, mask: '[REDACTED_AMOUNT]' },
  // Thai phone numbers (0xx-xxx-xxxx / +66...)
  { name: 'phone', re: /(?:\+66|0)\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}\b/g, mask: '[REDACTED_PHONE]' },
  // Generic long digit runs (bank accounts, ids) — catch-all, runs last
  { name: 'long_number', re: /\b\d{9,}\b/g, mask: '[REDACTED_NUMBER]' },
]

export type RedactionResult = { text: string; count: number; hits: Record<string, number> }

export function redactForProvider(input: string): RedactionResult {
  if (!input) return { text: input, count: 0, hits: {} }
  let text = input
  let count = 0
  const hits: Record<string, number> = {}
  for (const p of PATTERNS) {
    text = text.replace(p.re, () => {
      count++
      hits[p.name] = (hits[p.name] || 0) + 1
      return p.mask
    })
  }
  return { text, count, hits }
}
