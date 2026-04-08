/**
 * Spaced Repetition Scheduler — SM-2 Simplified
 *
 * Implements a simplified SM-2 algorithm for the ConceptState model.
 *
 * Forgetting curve: retention(t) = e^(-t/S)
 * Next review interval: S days (at ~37% retention — practical trigger point)
 * Ease factor: 1.3 + (score - 0.7) * 2.5  (maps 0→−0.45, 0.7→1.3, 1.0→2.05)
 * New S: max(0.5, S * ease_factor)
 * Poor recall (score < 0.6): missedReviews++, S halved, bloom drops 1
 *
 * Exported functions:
 *   computeNextReview           — pure SM-2 calculation (no DB)
 *   upsertConceptStateAfterSession — called post-scoring in session-analytics-service
 *   getDueConcepts              — returns overdue concepts for SR nudge
 */

import { prisma } from './prisma'
import { differenceInDays } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConceptStateForScheduler {
  stabilityFactor: number
  missedReviews: number
  bloomHighWater: number | null
}

export interface UpdatedSRState {
  stabilityFactor: number
  nextReviewAt: Date
  missedReviews: number
  bloomHighWater: number | null
}

export interface DueConceptWithHints {
  id: string
  conceptSlug: string
  courseId: string
  nextReviewAt: Date
  daysOverdue: number
  bloomHighWater: number | null
  stabilityFactor: number
  firedMisconceptions: string[]
  remediationHints: string[]  // from MisconceptionTaxonomy for this concept
}

// ── computeNextReview ─────────────────────────────────────────────────────────

const STABILITY_FLOOR = 0.5   // minimum S value — no review sooner than 12 hours
const POOR_RECALL_THRESHOLD = 0.6

/**
 * Pure SM-2 calculation. Does not touch the database.
 *
 * @param state   Current ConceptState SM-2 fields
 * @param score   Session quality score 0.0–1.0
 * @param bloomLevelThisSession  Bloom level observed in this session (optional)
 */
export function computeNextReview(
  state: ConceptStateForScheduler,
  score: number,
  bloomLevelThisSession?: number | null,
): UpdatedSRState {
  const now = new Date()
  const clampedScore = Math.min(1.0, Math.max(0.0, score))

  let { stabilityFactor, missedReviews, bloomHighWater } = state

  // Update bloom high-water mark
  if (bloomLevelThisSession != null && bloomLevelThisSession > (bloomHighWater ?? 0)) {
    bloomHighWater = bloomLevelThisSession
  }

  if (clampedScore < POOR_RECALL_THRESHOLD) {
    // Poor recall: reset path
    missedReviews += 1
    stabilityFactor = Math.max(STABILITY_FLOOR, stabilityFactor * 0.5)
    // Bloom drops one level on poor recall (knowledge degraded)
    if (bloomHighWater != null && bloomHighWater > 1) {
      bloomHighWater = bloomHighWater - 1
    }
  } else {
    // Good recall: SM-2 ease factor
    const easeFactor = 1.3 + (clampedScore - 0.7) * 2.5
    stabilityFactor = Math.max(STABILITY_FLOOR, stabilityFactor * easeFactor)
    missedReviews = 0  // reset consecutive miss counter on success
  }

  // nextReviewAt = now + stabilityFactor days
  const msPerDay = 24 * 60 * 60 * 1000
  const nextReviewAt = new Date(now.getTime() + stabilityFactor * msPerDay)

  return { stabilityFactor, nextReviewAt, missedReviews, bloomHighWater }
}

// ── upsertConceptStateAfterSession ────────────────────────────────────────────

/**
 * Called from session-analytics-service after scoring completes.
 * Uses ToolSession.conceptsTouched[] as concept slugs.
 * Creates/updates ConceptState for each concept, then refreshes StudentProfile.srDueCount.
 */
export async function upsertConceptStateAfterSession(
  sessionId: string,
  userId: string,
  courseId: string,
): Promise<void> {
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    select: {
      score: true,
      conceptsTouched: true,
      bloomLevel: true,
    },
  })

  if (!session || session.conceptsTouched.length === 0) return

  const sessionScore = session.score ?? 0.5  // default to 0.5 if unscored

  for (const rawSlug of session.conceptsTouched) {
    // Normalize: lowercase, replace spaces/special chars with hyphens
    const conceptSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100)

    if (!conceptSlug) continue

    // Find existing state or use defaults
    const existing = await prisma.conceptState.findUnique({
      where: { userId_courseId_conceptSlug: { userId, courseId, conceptSlug } },
      select: { stabilityFactor: true, missedReviews: true, bloomHighWater: true },
    })

    const currentState: ConceptStateForScheduler = existing ?? {
      stabilityFactor: 1.0,
      missedReviews: 0,
      bloomHighWater: null,
    }

    const updated = computeNextReview(currentState, sessionScore, session.bloomLevel ?? null)

    await prisma.conceptState.upsert({
      where: { userId_courseId_conceptSlug: { userId, courseId, conceptSlug } },
      create: {
        userId,
        courseId,
        conceptSlug,
        stabilityFactor: updated.stabilityFactor,
        nextReviewAt: updated.nextReviewAt,
        missedReviews: updated.missedReviews,
        bloomHighWater: updated.bloomHighWater ?? null,
      },
      update: {
        stabilityFactor: updated.stabilityFactor,
        nextReviewAt: updated.nextReviewAt,
        missedReviews: updated.missedReviews,
        bloomHighWater: updated.bloomHighWater ?? undefined,
      },
    })
  }

  // Refresh srDueCount on StudentProfile
  const dueCount = await prisma.conceptState.count({
    where: {
      userId,
      courseId,
      nextReviewAt: { lte: new Date() },
    },
  })

  await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId, srDueCount: dueCount, topConceptsThisWeek: [] },
    update: { srDueCount: dueCount },
  })
}

// ── getDueConcepts ────────────────────────────────────────────────────────────

/**
 * Returns concepts due for spaced-repetition review, enriched with remediation hints.
 * Ordered most-overdue first (largest gap between nextReviewAt and now).
 *
 * @param userId    The student
 * @param courseId  Optional — filter to a single course
 */
export async function getDueConcepts(
  userId: string,
  courseId?: string,
): Promise<DueConceptWithHints[]> {
  const now = new Date()

  const states = await prisma.conceptState.findMany({
    where: {
      userId,
      ...(courseId ? { courseId } : {}),
      nextReviewAt: { lte: now },
    },
    orderBy: { nextReviewAt: 'asc' },  // oldest due-date = most overdue
    take: 10,
    select: {
      id: true,
      conceptSlug: true,
      courseId: true,
      nextReviewAt: true,
      bloomHighWater: true,
      stabilityFactor: true,
      firedMisconceptions: true,
    },
  })

  if (states.length === 0) return []

  // Batch-fetch remediation hints for any fired misconceptions
  const allFiredIds = [...new Set(states.flatMap((s) => s.firedMisconceptions))]
  const taxonomyMap = new Map<string, string>()

  if (allFiredIds.length > 0) {
    const taxonomy = await prisma.misconceptionTaxonomy.findMany({
      where: { id: { in: allFiredIds } },
      select: { id: true, remediationHint: true },
    })
    for (const t of taxonomy) {
      taxonomyMap.set(t.id, t.remediationHint)
    }
  }

  return states.map((s) => ({
    id: s.id,
    conceptSlug: s.conceptSlug,
    courseId: s.courseId,
    nextReviewAt: s.nextReviewAt,
    daysOverdue: Math.max(0, differenceInDays(now, s.nextReviewAt)),
    bloomHighWater: s.bloomHighWater,
    stabilityFactor: s.stabilityFactor,
    firedMisconceptions: s.firedMisconceptions,
    remediationHints: s.firedMisconceptions
      .map((id) => taxonomyMap.get(id))
      .filter((h): h is string => h != null),
  }))
}
