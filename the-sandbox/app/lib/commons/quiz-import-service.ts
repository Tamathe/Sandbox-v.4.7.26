/**
 * Quiz Import Service — Convert external quiz data into Challenge rounds.
 *
 * Supports:
 * 1. Canvas Quiz JSON export format
 * 2. Plain text format (question / A) B) C) D) / correct: B)
 * 3. AI-parsed free text (paste any quiz and Sandy parses it)
 *
 * Returns structured rounds ready to be stored as LiveRoomRound records.
 */

import Anthropic from '@anthropic-ai/sdk'

export type { ImportedQuestion } from './types'
import type { ImportedQuestion } from './types'

/**
 * Parse Canvas-style quiz JSON export.
 * Canvas exports quizzes as JSON arrays of question objects.
 */
export function parseCanvasQuiz(data: unknown): ImportedQuestion[] {
  if (!Array.isArray(data)) return []

  return data
    .filter((q): q is Record<string, unknown> => q && typeof q === 'object')
    .map((q) => {
      const text = (q.question_text ?? q.question ?? q.text ?? '') as string
      const answers = (q.answers ?? q.options ?? []) as Array<Record<string, unknown>>

      if (!text || answers.length < 2) return null

      const options = answers.map((a, i) =>
        `${String.fromCharCode(65 + i)}) ${(a.text ?? a.answer ?? a.label ?? '') as string}`
      )

      const correctIdx = answers.findIndex((a) =>
        a.correct === true || a.weight === 100 || a.is_correct === true
      )

      return {
        question: stripHtml(text),
        options: options.slice(0, 4),
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
        explanation: (q.explanation ?? q.correct_comments ?? 'No explanation provided.') as string,
      }
    })
    .filter((q): q is ImportedQuestion => q !== null && q.options.length >= 2)
}

/**
 * Parse plain text quiz format:
 * Q: What is X?
 * A) Option 1
 * B) Option 2 *
 * C) Option 3
 * D) Option 4
 * (asterisk marks correct, or "Correct: B" line)
 */
export function parsePlainTextQuiz(text: string): ImportedQuestion[] {
  const questions: ImportedQuestion[] = []
  const blocks = text.split(/\n\s*\n/).filter(Boolean)

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 3) continue

    // First line is the question
    const questionLine = lines[0]!.replace(/^Q\d*[.:]\s*/, '').replace(/^\d+[.)]\s*/, '')

    // Parse options
    const optionLines = lines.slice(1).filter((l) => /^[A-Da-d][.)]\s/.test(l))
    if (optionLines.length < 2) continue

    const options = optionLines.map((l) => l.replace(/\*\s*$/, '').trim())

    // Find correct answer
    let correctIndex = optionLines.findIndex((l) => l.includes('*'))
    if (correctIndex < 0) {
      // Look for "Correct: X" line
      const correctLine = lines.find((l) => /^correct/i.test(l))
      if (correctLine) {
        const letter = correctLine.match(/[A-Da-d]/)?.[0]?.toUpperCase()
        if (letter) correctIndex = letter.charCodeAt(0) - 65
      }
    }

    questions.push({
      question: questionLine,
      options: options.slice(0, 4),
      correctIndex: Math.max(0, correctIndex),
      explanation: 'Imported from quiz bank.',
    })
  }

  return questions
}

/**
 * AI-parsed free text — paste any quiz content and Sandy structures it.
 * Uses Haiku for fast, cheap parsing.
 */
export async function aiParseQuiz(rawText: string): Promise<ImportedQuestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) return []

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `Parse the following quiz content into structured multiple-choice questions. Return ONLY a JSON array. Each object: {"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctIndex":0-3,"explanation":"..."}.  If you can't determine the correct answer, default to 0 and set explanation to "Verify correct answer". Parse as many questions as you can find.`,
      messages: [{ role: 'user', content: rawText.slice(0, 5000) }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as ImportedQuestion[]
    return parsed.filter(
      (q) =>
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        typeof q.correctIndex === 'number',
    )
  } catch {
    return []
  }
}

/**
 * Create a Challenge with pre-loaded questions (skips AI generation).
 */
export async function createChallengeFromImport(
  channelId: string,
  hostId: string,
  title: string,
  questions: ImportedQuestion[],
  courseId?: string,
): Promise<string> {
  const { prisma } = await import('../prisma')

  // Create room
  const room = await prisma.liveRoom.create({
    data: {
      channelId,
      hostId,
      type: 'CHALLENGE',
      title,
      config: { rounds: questions.length, topic: title, imported: true },
      courseId: courseId ?? null,
    },
  })

  // Pre-create all rounds
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!
    await prisma.liveRoomRound.create({
      data: {
        roomId: room.id,
        roundNumber: i + 1,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        timeoutMs: 15000,
      },
    })
  }

  // Auto-join host
  await prisma.liveRoomParticipant.create({
    data: { roomId: room.id, userId: hostId },
  })

  // Post activity message
  await prisma.channelMessage.create({
    data: {
      channelId,
      authorId: hostId,
      content: `started a Challenge: "${title}" (${questions.length} imported questions)`,
      messageType: 'live_room',
      liveRoomId: room.id,
      isSandy: false,
    },
  })

  // Notify group
  const { notifyGroupOfLiveRoom } = await import('./notification-service')
  void notifyGroupOfLiveRoom(room.id, channelId, hostId, 'CHALLENGE', title)

  return room.id
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}
