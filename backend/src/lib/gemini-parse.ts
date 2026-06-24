/** JSON parser for AI responses — strips markdown fences */

export function parseGeminiJSON(text: string): any {
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  try {
    return JSON.parse(clean)
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch { /* fall through */ }
    }
    throw new Error(`AI did not return valid JSON: ${clean.slice(0, 300)}`)
  }
}
