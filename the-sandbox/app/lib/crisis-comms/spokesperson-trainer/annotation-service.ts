/**
 * annotation-service.ts
 *
 * Generates per-answer annotations for the Replay Panel.
 * Sends the full interview transcript to Claude Haiku for analysis,
 * returning structured annotations for each Q&A exchange.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { AnswerAnnotation } from './types'

const anthropic = new Anthropic()

/**
 * Extract Q&A pairs from the interview transcript (assistant = reporter, user = spokesperson).
 * Skips setup/debrief messages — only returns interview exchanges.
 */
function extractQAPairs(messages: { role: 'user' | 'assistant'; content: string }[]): {
  question: string
  answer: string
}[] {
  const pairs: { question: string; answer: string }[] = []
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i]
    const next = messages[i + 1]
    if (
      msg.role === 'assistant' &&
      next.role === 'user' &&
      msg.content.includes('<!--PHASE:interview-->')
    ) {
      // Strip HTML comment markers from the question text
      const cleanQuestion = msg.content
        .replace(/<!--.*?-->/gs, '')
        .trim()
      pairs.push({ question: cleanQuestion, answer: next.content.trim() })
    }
  }
  return pairs
}

/**
 * Generate per-answer annotations for the replay panel.
 */
export async function generateAnnotations(
  messages: { role: 'user' | 'assistant'; content: string }[],
  keyMessages: string[],
  scenarioTitle: string,
  difficulty: string,
): Promise<AnswerAnnotation[]> {
  const pairs = extractQAPairs(messages)
  if (pairs.length === 0) return []

  const keyMessagesBlock = keyMessages.length > 0
    ? `\nThe spokesperson defined these key messages before the drill:\n${keyMessages.map((m, i) => `${i + 1}. "${m}"`).join('\n')}\n\nFor each answer, evaluate which key messages were landed and which were missed.`
    : '\nNo key messages were defined. Leave keyMessagesLanded and keyMessagesMissed as empty arrays.'

  const prompt = `You are a crisis communications expert analyzing a media training drill transcript.

Scenario: ${scenarioTitle} (${difficulty} difficulty)
${keyMessagesBlock}

Here is the interview transcript (${pairs.length} Q&A exchanges):

${pairs.map((p, i) => `--- Exchange ${i + 1} ---\nREPORTER: ${p.question}\nSPOKESPERSON: ${p.answer}`).join('\n\n')}

For EACH exchange, provide a JSON annotation object. Return a JSON array with exactly ${pairs.length} objects.

Each object must have:
- questionIndex: number (0-based)
- reporterQuestion: string (the reporter's question — use the full text, do not shorten)
- userAnswer: string (the spokesperson's answer — use the full text, do not shorten)
- rating: "strong" | "adequate" | "weak"
- techniques: string[] (crisis comms techniques used or missed — e.g., "bridge", "block", "empathy-lead", "fact-forward", "pivot", "acknowledge-unknown", "deflection", "speculation")
- note: string (1-2 sentence coaching note — what worked or what should change)
- keyMessagesLanded: string[] (exact text of key messages delivered in this answer)
- keyMessagesMissed: string[] (exact text of key messages that had an opening here but were missed)

Rating criteria:
- "strong": Clear, empathetic, fact-forward, on-message, used good technique
- "adequate": Decent but missed an opportunity or was slightly vague
- "weak": Speculated, got defensive, went off-message, missed empathy, or bluffed

Return ONLY the JSON array, no other text.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Extract JSON array from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0]) as AnswerAnnotation[]
    return parsed.map((a, i) => ({ ...a, questionIndex: i }))
  } catch {
    return []
  }
}
