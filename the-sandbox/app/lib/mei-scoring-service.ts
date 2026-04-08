/**
 * Mastery Efficiency Index (MEI) Scoring Service
 *
 * Computes an efficiency-based assessment score from a student's tool usage
 * sessions. Students are graded on how quickly they improve (less time, higher
 * scores, fewer hints) across multiple sessions — not on engagement volume.
 *
 * Mirrors error handling patterns from grading-service.ts and
 * analytics/rubric-breakdown-service.ts: try/catch with console.error, never
 * throws to callers.
 */

import { prisma } from './prisma'
import type { Prisma } from '../generated/prisma'
import { createNotification } from './notifications'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MeiDimensions {
  durationTrend: number    // 0–100
  scoreTrend: number       // 0–100
  hintIndependence: number // 0–100
  reformulationDecline: number // 0–100
  bloomCeiling: number     // 0–100
}

export interface MeiResult {
  meiScore: number
  dimensions: MeiDimensions
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Split array into first-half and second-half by index. */
function halves<T>(arr: T[]): [T[], T[]] {
  const mid = Math.ceil(arr.length / 2)
  return [arr.slice(0, mid), arr.slice(mid)]
}

/** Simple linear regression slope for y-values indexed 0..n-1. */
function linearSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const meanX = (n - 1) / 2
  const meanY = avg(values)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY)
    den += (i - meanX) ** 2
  }
  return den === 0 ? 0 : num / den
}

const BLOOM_MAP: Record<number, number> = {
  1: 17, 2: 33, 3: 50, 4: 67, 5: 83, 6: 100,
}

// ── Dimension Computations ───────────────────────────────────────────────────

function computeDurationTrend(sessions: { durationSeconds: number | null }[]): number {
  const durations = sessions
    .map((s) => s.durationSeconds)
    .filter((d): d is number => d != null)
  if (durations.length < 2) return 50 // Not enough data — neutral

  const [firstHalf, secondHalf] = halves(durations)
  const firstAvg = avg(firstHalf)
  const secondAvg = avg(secondHalf)

  if (firstAvg <= 0) return 50

  const improvement = 1 - secondAvg / firstAvg
  if (improvement <= 0) return 0 // Getting slower

  let score = clamp(improvement, 0, 1) * 100

  // Bonus: if final session < 50% of first session
  const first = durations[0]
  const last = durations[durations.length - 1]
  if (first > 0 && last < first * 0.5) {
    score = Math.min(100, score + 10)
  }

  return Math.round(score)
}

function computeScoreTrend(sessions: { score: number | null }[]): number {
  const scores = sessions
    .map((s) => s.score)
    .filter((s): s is number => s != null)
  if (scores.length < 2) return 50

  const slope = linearSlope(scores)
  // Normalize: a slope of ~0.1 per session (going from 0.3 to ~0.8 over 5 sessions) maps to ~100
  const normalized = clamp(slope / 0.1, 0, 1) * 100

  let score = Math.round(normalized)

  // Floor at 60 if final session score >= 0.75
  const finalScore = scores[scores.length - 1]
  if (finalScore >= 0.75 && score < 60) {
    score = 60
  }

  return score
}

function computeHintIndependence(sessions: { hintCount: number | null }[]): number {
  const hints = sessions.map((s) => s.hintCount)
  const nonNull = hints.filter((h): h is number => h != null)

  if (nonNull.length === 0) return 70 // All null — default

  const [firstHalf, secondHalf] = halves(nonNull)
  const firstAvg = avg(firstHalf)
  const secondAvg = avg(secondHalf)

  let score: number
  if (firstAvg <= 0) {
    // Started with no hints — already independent
    score = 90
  } else {
    const improvement = 1 - secondAvg / firstAvg
    score = clamp(improvement, 0, 1) * 100
  }

  // Bonus: if any session has hintCount = 0
  if (nonNull.some((h) => h === 0)) {
    score = Math.min(100, score + 15)
  }

  return Math.round(score)
}

function computeReformulationDecline(sessions: { reformulationCount: number | null }[]): number {
  const reforms = sessions.map((s) => s.reformulationCount)
  const nonNull = reforms.filter((r): r is number => r != null)

  if (nonNull.length === 0) return 70 // All null — default

  const [firstHalf, secondHalf] = halves(nonNull)
  const firstAvg = avg(firstHalf)
  const secondAvg = avg(secondHalf)

  if (firstAvg <= 0) return 90 // Started with no reformulations

  const improvement = 1 - secondAvg / firstAvg
  return Math.round(clamp(improvement, 0, 1) * 100)
}

function computeBloomCeiling(sessions: { bloomLevel: number | null }[]): number {
  const levels = sessions
    .map((s) => s.bloomLevel)
    .filter((l): l is number => l != null)

  if (levels.length === 0) return 50 // Default

  const maxLevel = Math.max(...levels)
  return BLOOM_MAP[clamp(maxLevel, 1, 6)] ?? 50
}

// ── Feedback Generator ───────────────────────────────────────────────────────

export function generateMEIFeedback(dimensions: MeiDimensions, sessionsAnalyzed: number): string {
  const strong: string[] = []
  const weak: string[] = []

  if (dimensions.durationTrend > 70) strong.push('time efficiency')
  else if (dimensions.durationTrend < 40) weak.push('completion speed')

  if (dimensions.scoreTrend > 70) strong.push('score improvement')
  else if (dimensions.scoreTrend < 40) weak.push('score progression')

  if (dimensions.hintIndependence > 70) strong.push('hint independence')
  else if (dimensions.hintIndependence < 40) weak.push('reliance on hints')

  if (dimensions.reformulationDecline > 70) strong.push('question clarity')
  else if (dimensions.reformulationDecline < 40) weak.push('question reformulation')

  if (dimensions.bloomCeiling > 70) strong.push('higher-order thinking')
  else if (dimensions.bloomCeiling < 40) weak.push('cognitive complexity')

  const parts: string[] = []

  // Sentence 1: overview
  if (strong.length > 0) {
    parts.push(
      `You completed ${sessionsAnalyzed} sessions, showing strong ${strong.join(' and ')}.`
    )
  } else {
    parts.push(
      `You completed ${sessionsAnalyzed} sessions with room for growth across several dimensions.`
    )
  }

  // Sentence 2: area for improvement or encouragement
  if (weak.length > 0) {
    parts.push(
      `Focus on improving ${weak.join(' and ')} in future sessions.`
    )
  } else {
    parts.push('Keep up the excellent work across all dimensions.')
  }

  return parts.join(' ')
}

// ── Main Compute Function ────────────────────────────────────────────────────

export async function computeMEI(
  studentId: string,
  assignmentId: string,
): Promise<MeiResult | null> {
  try {
    // 1. Load assignment and verify type
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        type: true,
        assessmentToolIds: true,
        minimumAttempts: true,
        courseId: true,
        createdAt: true,
        dueAt: true,
        assessmentWindowEnd: true,
        pointsPossible: true,
      },
    })

    if (!assignment) {
      console.error(`[mei-scoring] Assignment ${assignmentId} not found`)
      return null
    }

    if (assignment.type !== 'TOOL_ASSESSMENT') {
      console.error(`[mei-scoring] Assignment ${assignmentId} is not TOOL_ASSESSMENT`)
      return null
    }

    const minAttempts = assignment.minimumAttempts ?? 3
    const windowStart = assignment.createdAt
    const windowEnd = assignment.assessmentWindowEnd ?? new Date()

    // 2. Query qualifying sessions
    const sessions = await prisma.toolSession.findMany({
      where: {
        userId: studentId,
        toolId: { in: assignment.assessmentToolIds },
        courseId: assignment.courseId,
        startedAt: { gte: windowStart, lte: windowEnd },
        score: { gte: 0.3 },
        exitReason: 'completed',
        durationSeconds: { not: null },
      },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        startedAt: true,
        durationSeconds: true,
        score: true,
        hintCount: true,
        reformulationCount: true,
        bloomLevel: true,
      },
    })

    // 3. Check minimum
    if (sessions.length < minAttempts) {
      console.info(
        `[mei-scoring] Student ${studentId} has ${sessions.length}/${minAttempts} qualifying sessions for assignment ${assignmentId} — not enough`
      )
      return null
    }

    // 4. Compute dimensions
    const dimensions: MeiDimensions = {
      durationTrend: computeDurationTrend(sessions),
      scoreTrend: computeScoreTrend(sessions),
      hintIndependence: computeHintIndependence(sessions),
      reformulationDecline: computeReformulationDecline(sessions),
      bloomCeiling: computeBloomCeiling(sessions),
    }

    // 5. Composite score
    const meiScore = Math.round(
      dimensions.durationTrend * 0.30 +
      dimensions.scoreTrend * 0.25 +
      dimensions.hintIndependence * 0.15 +
      dimensions.reformulationDecline * 0.15 +
      dimensions.bloomCeiling * 0.15
    )

    const feedback = generateMEIFeedback(dimensions, sessions.length)
    const sessionIds = sessions.map((s) => s.id)
    const firstSessionAt = sessions[0].startedAt
    const lastSessionAt = sessions[sessions.length - 1].startedAt

    // 6. Persist — upsert MasteryEfficiencyScore, Submission, GradebookEntry
    await prisma.$transaction(async (tx) => {
      // Upsert MasteryEfficiencyScore
      await tx.masteryEfficiencyScore.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId,
          },
        },
        create: {
          assignmentId,
          studentId,
          courseId: assignment.courseId,
          meiScore,
          durationTrend: dimensions.durationTrend,
          scoreTrend: dimensions.scoreTrend,
          hintIndependence: dimensions.hintIndependence,
          reformulationDecline: dimensions.reformulationDecline,
          bloomCeiling: dimensions.bloomCeiling,
          sessionsAnalyzed: sessions.length,
          qualifiedSessionIds: sessionIds,
          firstSessionAt,
          lastSessionAt,
        },
        update: {
          meiScore,
          durationTrend: dimensions.durationTrend,
          scoreTrend: dimensions.scoreTrend,
          hintIndependence: dimensions.hintIndependence,
          reformulationDecline: dimensions.reformulationDecline,
          bloomCeiling: dimensions.bloomCeiling,
          sessionsAnalyzed: sessions.length,
          qualifiedSessionIds: sessionIds,
          firstSessionAt,
          lastSessionAt,
          computedAt: new Date(),
        },
      })

      // Upsert Submission
      const submission = await tx.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId,
          },
        },
        create: {
          assignmentId,
          studentId,
          type: 'TOOL_ASSESSMENT',
          textContent: JSON.stringify({
            meiScore,
            dimensions,
            sessionsAnalyzed: sessions.length,
            qualifiedSessionIds: sessionIds,
          }),
        },
        update: {
          textContent: JSON.stringify({
            meiScore,
            dimensions,
            sessionsAnalyzed: sessions.length,
            qualifiedSessionIds: sessionIds,
          }),
        },
      })

      // Upsert GradebookEntry
      const existingEntry = await tx.gradebookEntry.findUnique({
        where: { submissionId: submission.id },
      })

      const gradebookData = {
        aiScore: meiScore,
        status: 'AI_DRAFT' as const,
        aiRawFeedback: feedback,
        aiCriteriaScores: {
          durationTrend: { score: dimensions.durationTrend, weight: 0.30 },
          scoreTrend: { score: dimensions.scoreTrend, weight: 0.25 },
          hintIndependence: { score: dimensions.hintIndependence, weight: 0.15 },
          reformulationDecline: { score: dimensions.reformulationDecline, weight: 0.15 },
          bloomCeiling: { score: dimensions.bloomCeiling, weight: 0.15 },
        } as unknown as Prisma.InputJsonValue,
      }

      if (existingEntry) {
        await tx.gradebookEntry.update({
          where: { id: existingEntry.id },
          data: gradebookData,
        })
      } else {
        await tx.gradebookEntry.create({
          data: {
            submissionId: submission.id,
            ...gradebookData,
          },
        })
      }
    })

    console.info(
      `[mei-scoring] Computed MEI for student ${studentId}, assignment ${assignmentId}: ${meiScore} (${sessions.length} sessions)`
    )

    // Fire-and-forget notification to the student
    createNotification({
      userId: studentId,
      type: 'MEI_SCORE_COMPUTED',
      title: 'MEI Score Updated',
      body: `Your Mastery Efficiency Index score is ${meiScore.toFixed(1)} — ${feedback}`,
      href: `/assignments/${assignmentId}`,
    }).catch(() => { /* non-fatal */ })

    return { meiScore, dimensions }
  } catch (err) {
    console.error(`[mei-scoring] Failed for student ${studentId}, assignment ${assignmentId}:`, err)
    return null
  }
}
