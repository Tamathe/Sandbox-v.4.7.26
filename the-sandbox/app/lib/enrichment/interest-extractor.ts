// ─── LLM Interest Extractor ───────────────────────────────────────────────────
// Extracts concise interest tags from faculty bio text and/or research interest
// strings. Uses Claude Haiku with a strict JSON output instruction.

import Anthropic from '@anthropic-ai/sdk'
import type { EnrichedInterest, FieldSource } from './types'

const client = new Anthropic()

/**
 * Given raw text (bio paragraph, research interests list, ORCID keywords),
 * returns up to 8 short interest tags.
 */
export async function extractInterests(
  text: string,
  source: FieldSource,
): Promise<EnrichedInterest[]> {
  if (!text.trim()) return []

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: `You extract academic interests from faculty text.
Return ONLY a JSON array of short tags (2-5 words each, Title Case).
Maximum 8 tags. Only include interests explicitly mentioned or clearly implied.
Example: ["Entrepreneurship Education", "AI in Learning", "Technology Transfer"]`,
      messages: [
        {
          role: 'user',
          content: `Text: """${text.slice(0, 1200)}"""`,
        },
      ],
    })

    const raw = resp.content[0].type === 'text' ? resp.content[0].text.trim() : '[]'
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    const tags: string[] = JSON.parse(cleaned)

    if (!Array.isArray(tags)) return []

    return tags
      .filter((t) => typeof t === 'string' && t.length > 2 && t.length < 60)
      .slice(0, 8)
      .map((tag) => ({ tag, source }))
  } catch {
    return []
  }
}

/**
 * Merge interests from multiple sources, deduplicating by lowercase tag.
 */
export function mergeInterests(
  ...groups: EnrichedInterest[][]
): EnrichedInterest[] {
  const seen = new Set<string>()
  const result: EnrichedInterest[] = []
  for (const group of groups) {
    for (const interest of group) {
      const key = interest.tag.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        result.push(interest)
      }
    }
  }
  return result
}
