/**
 * Micro-Review Service — Interstitial Spaced Repetition Reviews
 *
 * Generates quick review questions from a student's SR queue when they
 * enter a course page, grades their response via Haiku, and updates
 * the ConceptState accordingly.
 *
 * Exports:
 *   getMicroReview          — fetch or generate a review for a course visit
 *   submitMicroReviewResponse — grade the student's answer and update SR state
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { getDueConcepts, computeNextReview } from './sr-scheduler'
import type { ConceptStateForScheduler } from './sr-scheduler'
import { upsertConceptMastery } from './concept-mastery-service'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MicroReviewResponse {
  available: boolean
  review?: {
    id: string
    question: string
    bloomLevel: number
    conceptSlug: string
    conceptLabel: string
    courseName: string
    daysOverdue: number
  }
}

export interface MicroReviewSubmitResult {
  skipped?: boolean
  correct?: boolean
  feedback?: string
  hint?: string
  correctAnswer?: string
  nextReviewIn?: string
}

// ── Bloom labels for prompt calibration ───────────────────────────────────────

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember (recall facts)',
  2: 'Understand (explain concepts)',
  3: 'Apply (use in a new context)',
  4: 'Analyze (break down and compare)',
  5: 'Evaluate (judge and critique)',
  6: 'Create (synthesize something new)',
}

// ── getMicroReview ────────────────────────────────────────────────────────────

export async function getMicroReview(
  userId: string,
  courseId: string,
): Promise<MicroReviewResponse> {
  // 1. Throttle: max 1 per course per 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recent = await prisma.microReview.findFirst({
    where: {
      userId,
      courseId,
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: { id: true },
  })
  if (recent) return { available: false }

  // 2. Get due concepts from SR scheduler
  const dueConcepts = await getDueConcepts(userId, courseId)
  if (dueConcepts.length === 0) return { available: false }

  // 3. Pick the most overdue concept
  const topConcept = dueConcepts[0]
  const bloomLevel = topConcept.bloomHighWater ?? 2 // default to Understand

  // 4. Fetch course name
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true, courseCode: true },
  })
  if (!course) return { available: false }

  // 5. Generate question via Haiku
  const bloomLabel = BLOOM_LABELS[bloomLevel] ?? BLOOM_LABELS[2]
  const conceptLabel = topConcept.conceptSlug.replace(/-/g, ' ')

  const aiResponse = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are an expert educator creating a quick spaced-repetition review question.

Course: ${course.courseCode} — ${course.title}
Concept: ${conceptLabel}
Bloom Level: ${bloomLabel}
Days since last review: ${topConcept.daysOverdue}

Generate ONE review question and its correct answer for this concept at the specified Bloom level. The question should be answerable in 1-3 sentences.

Respond in this exact JSON format:
{"question": "...", "answer": "..."}`,
      },
    ],
  })

  let question = `What do you know about ${conceptLabel}?`
  let answer = `A correct explanation of ${conceptLabel}.`

  const textBlock = aiResponse.content.find((b) => b.type === 'text')
  if (textBlock && textBlock.type === 'text') {
    try {
      const parsed = JSON.parse(textBlock.text)
      if (parsed.question && parsed.answer) {
        question = parsed.question
        answer = parsed.answer
      }
    } catch {
      // Use fallback question/answer
    }
  }

  // 6. Create MicroReview record
  const review = await prisma.microReview.create({
    data: {
      userId,
      courseId,
      conceptSlug: topConcept.conceptSlug,
      question,
      answer,
      bloomLevel,
    },
  })

  return {
    available: true,
    review: {
      id: review.id,
      question,
      bloomLevel,
      conceptSlug: topConcept.conceptSlug,
      conceptLabel,
      courseName: `${course.courseCode} — ${course.title}`,
      daysOverdue: topConcept.daysOverdue,
    },
  }
}

// ── submitMicroReviewResponse ─────────────────────────────────────────────────

export async function submitMicroReviewResponse(
  reviewId: string,
  userId: string,
  answer: string | null,
  skipped: boolean,
  responseTimeMs?: number,
): Promise<MicroReviewSubmitResult> {
  // Fetch review + verify ownership
  const review = await prisma.microReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      userId: true,
      courseId: true,
      conceptSlug: true,
      question: true,
      answer: true,
      bloomLevel: true,
    },
  })
  if (!review || review.userId !== userId) {
    throw new Error('Review not found')
  }

  // Handle skip
  if (skipped || !answer) {
    await prisma.microReview.update({
      where: { id: reviewId },
      data: { skipped: true },
    })
    return { skipped: true }
  }

  // Grade via Haiku
  const gradeResponse = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are grading a student's answer to a review question.

Question: ${review.question}
Expected answer: ${review.answer}
Student's answer: ${answer}

Score the answer from 0.0 to 1.0 where 1.0 is perfectly correct and 0.0 is completely wrong. Be generous — partial understanding counts. Provide brief feedback.

Respond in this exact JSON format:
{"score": 0.0, "feedback": "Brief explanation of what was right/wrong"}`,
      },
    ],
  })

  let score = 0.5
  let feedback: string | undefined
  const gradeBlock = gradeResponse.content.find((b) => b.type === 'text')
  if (gradeBlock && gradeBlock.type === 'text') {
    try {
      const parsed = JSON.parse(gradeBlock.text)
      if (typeof parsed.score === 'number') {
        score = Math.min(1.0, Math.max(0.0, parsed.score))
      }
      if (typeof parsed.feedback === 'string') {
        feedback = parsed.feedback
      }
    } catch {
      // Regex fallback for score
      const scoreMatch = gradeBlock.text.match(/"score"\s*:\s*([\d.]+)/)
      if (scoreMatch) {
        score = Math.min(1.0, Math.max(0.0, parseFloat(scoreMatch[1])))
      }
    }
  }

  const correct = score >= 0.6

  // Update MicroReview record
  await prisma.microReview.update({
    where: { id: reviewId },
    data: {
      studentAnswer: answer,
      correct,
      responseTimeMs: responseTimeMs ?? null,
    },
  })

  // Fetch current ConceptState for SR update
  const conceptState = await prisma.conceptState.findUnique({
    where: {
      userId_courseId_conceptSlug: {
        userId,
        courseId: review.courseId,
        conceptSlug: review.conceptSlug,
      },
    },
    select: {
      stabilityFactor: true,
      missedReviews: true,
      bloomHighWater: true,
    },
  })

  if (conceptState) {
    const srState: ConceptStateForScheduler = {
      stabilityFactor: conceptState.stabilityFactor,
      missedReviews: conceptState.missedReviews,
      bloomHighWater: conceptState.bloomHighWater,
    }

    const srScore = correct ? 0.8 : 0.3
    const updated = computeNextReview(srState, srScore)

    await prisma.conceptState.update({
      where: {
        userId_courseId_conceptSlug: {
          userId,
          courseId: review.courseId,
          conceptSlug: review.conceptSlug,
        },
      },
      data: {
        stabilityFactor: updated.stabilityFactor,
        nextReviewAt: updated.nextReviewAt,
        missedReviews: updated.missedReviews,
        bloomHighWater: updated.bloomHighWater ?? undefined,
      },
    })

    // Update concept mastery tracking
    await upsertConceptMastery(userId, review.conceptSlug, review.courseId, srScore)

    // Calculate next review display string
    const daysUntil = Math.round(updated.stabilityFactor)
    const nextReviewIn =
      daysUntil <= 1 ? 'tomorrow' : `${daysUntil} days`

    if (correct) {
      return { correct: true, feedback, nextReviewIn }
    }

    // Look up remediation hint for incorrect answers
    let hint: string | undefined
    const misconceptions = await prisma.misconceptionTaxonomy.findMany({
      where: {
        courseId: review.courseId,
        conceptSlug: review.conceptSlug,
      },
      select: { remediationHint: true },
      take: 1,
    })
    if (misconceptions.length > 0) {
      hint = misconceptions[0].remediationHint
    }

    return {
      correct: false,
      feedback,
      hint,
      correctAnswer: review.answer,
      nextReviewIn,
    }
  }

  // No ConceptState — update mastery only, return result without SR update
  const srScore = correct ? 0.8 : 0.3
  await upsertConceptMastery(userId, review.conceptSlug, review.courseId, srScore)

  return {
    correct,
    feedback,
    correctAnswer: correct ? undefined : review.answer,
  }
}
