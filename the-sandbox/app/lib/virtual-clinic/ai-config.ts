import Anthropic from '@anthropic-ai/sdk'

// ─── Model Constants ────────────────────────────────────────────────────────

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001' as const
export const SONNET_MODEL = 'claude-sonnet-4-6' as const
export const HAIKU_MAX_TOKENS = 2048
export const CHAT_MAX_TOKENS = 512
export const AFFECT_MAX_TOKENS = 256
export const IMPORT_MAX_TOKENS = 8192

// ─── Shared Anthropic Client ────────────────────────────────────────────────

export const anthropic = new Anthropic()

// ─── JSON Extraction ────────────────────────────────────────────────────────

/**
 * Extracts JSON from an AI response that may be wrapped in markdown code fences.
 * Prefers the last ```json``` block when multiple fences exist (Haiku sometimes adds preamble).
 * Falls back to the raw text if no fences are found.
 */
export function extractJsonFromAIResponse(text: string): string {
  const fences = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)]
  const candidate = fences.length > 0 ? fences[fences.length - 1][1] : text
  return candidate.trim()
}

// ─── Parse Error ────────────────────────────────────────────────────────────

export class AIParseError extends Error {
  raw: string
  constructor(raw: string) {
    super('AI returned unparseable JSON')
    this.name = 'AIParseError'
    this.raw = raw.slice(0, 500)
  }
}

// ─── Shared Haiku JSON Helper ───────────────────────────────────────────────

/**
 * Calls Haiku with a system prompt and user message, parses the JSON response.
 * Throws AIParseError if the response cannot be parsed.
 */
export async function callHaikuJSON<T>(system: string, userMessage: string, maxTokens?: number): Promise<T> {
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: maxTokens ?? HAIKU_MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const candidate = extractJsonFromAIResponse(text)
  try {
    return JSON.parse(candidate) as T
  } catch {
    throw new AIParseError(candidate)
  }
}
