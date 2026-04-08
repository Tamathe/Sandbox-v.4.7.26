import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickReviewCard {
  id: string
  conceptName: string
  courseCode: string
  front: string
  back: string
  interval: number
  easeFactor: number
  lapses: number
}

export type ReviewQuality = 'again' | 'hard' | 'good' | 'easy'

const QUALITY_SCORES: Record<ReviewQuality, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
}

// ─── Fetch due flashcards ─────────────────────────────────────────────────────

export async function getDueFlashcards(
  userId: string,
  limit: number = 10,
): Promise<{ cards: QuickReviewCard[]; total: number }> {
  const now = new Date()

  const dueCards = await prisma.flashcardState.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
    },
    orderBy: { nextReviewAt: 'asc' },
    take: limit,
    include: {
      course: { select: { courseCode: true } },
    },
  })

  if (dueCards.length === 0) {
    return { cards: [], total: 0 }
  }

  // Find cards that need generated backs
  const needsBacks = dueCards.filter(c => !c.cardBack)

  if (needsBacks.length > 0) {
    await generateAndCacheBacks(needsBacks)
  }

  // Re-fetch to get the cached backs (if any were generated)
  const freshCards = needsBacks.length > 0
    ? await prisma.flashcardState.findMany({
        where: { id: { in: dueCards.map(c => c.id) } },
        include: { course: { select: { courseCode: true } } },
        orderBy: { nextReviewAt: 'asc' },
      })
    : dueCards

  const cards: QuickReviewCard[] = freshCards.map(c => ({
    id: c.id,
    conceptName: c.conceptSlug.replace(/-/g, ' '),
    courseCode: c.course.courseCode,
    front: c.cardFront,
    back: c.cardBack || c.conceptSlug.replace(/-/g, ' '),
    interval: c.stabilityDays,
    easeFactor: c.easeFactor,
    lapses: c.lastQuality < 3 ? 1 : 0,
  }))

  // Get total count of all due cards (not just the page)
  const total = await prisma.flashcardState.count({
    where: { userId, nextReviewAt: { lte: now } },
  })

  return { cards, total }
}

// ─── Generate card backs via Haiku (batch) ────────────────────────────────────

async function generateAndCacheBacks(
  cards: Array<{ id: string; conceptSlug: string; cardFront: string; course: { courseCode: string } }>,
): Promise<void> {
  const cardDescriptions = cards
    .map((c, i) => `${i + 1}. Course: ${c.course.courseCode} | Concept: ${c.conceptSlug.replace(/-/g, ' ')} | Question: ${c.cardFront}`)
    .join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Generate concise flashcard answers for these study cards. Each answer should be 1-3 sentences — clear, accurate, and suitable for quick review.

${cardDescriptions}

Respond with ONLY a JSON array of strings, one answer per card, in the same order. Example: ["Answer 1", "Answer 2"]`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return

    const answers: string[] = JSON.parse(jsonMatch[0])

    // Cache backs in DB
    const updates = cards.map((card, i) =>
      prisma.flashcardState.update({
        where: { id: card.id },
        data: { cardBack: answers[i] || card.conceptSlug.replace(/-/g, ' ') },
      }),
    )
    await Promise.all(updates)
  } catch {
    // If AI generation fails, set a simple fallback so we don't retry every time
    const updates = cards.map(card =>
      prisma.flashcardState.update({
        where: { id: card.id },
        data: { cardBack: `Key concept: ${card.conceptSlug.replace(/-/g, ' ')}` },
      }),
    )
    await Promise.all(updates)
  }
}

// ─── Submit review rating ─────────────────────────────────────────────────────

export async function submitFlashcardReview(
  userId: string,
  flashcardId: string,
  quality: ReviewQuality,
): Promise<{ success: boolean; nextReviewAt: Date }> {
  const card = await prisma.flashcardState.findUnique({
    where: { id: flashcardId },
  })

  if (!card || card.userId !== userId) {
    throw new Error('Flashcard not found')
  }

  const q = QUALITY_SCORES[quality]

  // SM-2 algorithm (matches existing flashcard-review route logic)
  const oldEF = card.easeFactor
  const oldStability = card.stabilityDays
  const oldReviewCount = card.reviewCount

  const newEF = Math.max(1.3, oldEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  let newStability: number
  if (q < 3) {
    newStability = 0.5 // 12 hours
  } else if (oldReviewCount === 0) {
    newStability = 1.0
  } else if (oldReviewCount === 1) {
    newStability = 3.0
  } else {
    newStability = oldStability * newEF
  }
  newStability = Math.min(180, newStability)

  const msPerDay = 24 * 60 * 60 * 1000
  const nextReviewAt = new Date(Date.now() + newStability * msPerDay)

  await prisma.flashcardState.update({
    where: { id: flashcardId },
    data: {
      stabilityDays: newStability,
      nextReviewAt,
      easeFactor: newEF,
      reviewCount: oldReviewCount + 1,
      lastQuality: q,
    },
  })

  return { success: true, nextReviewAt }
}
