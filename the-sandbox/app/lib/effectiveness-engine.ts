/**
 * Effectiveness Engine
 *
 * Computes three kinds of intelligence from raw session + objective data:
 *   1. ObjectiveProgressSnapshot  — daily cohort mastery snapshot per objective
 *   2. SessionInteractionPattern  — Haiku-extracted behavioral pattern per session
 *   3. ToolEffectivenessAggregate — nightly rolling-window aggregate per tool × course
 *
 * Called by:
 *   - POST /api/cron/effectiveness-rollup  (nightly, via rollupAggregates)
 *   - POST /api/sessions/[id]/end          (fire-and-forget, via extractSessionInteractionPattern)
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { Prisma } from '../generated/prisma'

const anthropic = new Anthropic()

// ── Types ─────────────────────────────────────────────────────────────────────

interface InteractionPatternResult {
  primaryStrategy: string | null
  questionDepth: number | null
  helpSeekingRatio: number | null
  conceptsApplied: string[]
  errorPatterns: string[]
  breakthroughTurn: number | null
  scaffoldingAccepted: boolean | null
  patternJson: Record<string, unknown>
}

// ── 1. ObjectiveProgressSnapshot ─────────────────────────────────────────────

/**
 * Compute and upsert ObjectiveProgressSnapshot rows for every objective in a
 * course.  Safe to call multiple times on the same day — @@unique constraint
 * on (objectiveId, snapshotDate) means the upsert is idempotent.
 *
 * @param courseId   - the course to snapshot
 * @param snapshotDate - UTC midnight Date for the snapshot; defaults to today
 */
export async function computeObjectiveProgressSnapshot(
  courseId: string,
  snapshotDate: Date = midnightUTC(new Date()),
): Promise<void> {
  // 1. All objectives for this course
  const objectives = await prisma.learningObjective.findMany({
    where: { courseId },
    select: { id: true },
  })
  if (objectives.length === 0) return

  // 2. Enrolled student count (authoritative denominator)
  const totalStudents = await prisma.courseEnrollment.count({ where: { courseId } })
  if (totalStudents === 0) return

  // 3. Mastery distribution per objective via groupBy
  const grouped = await prisma.studentObjectiveProgress.groupBy({
    by: ['objectiveId', 'masteryLevel'],
    where: { courseId },
    _count: { id: true },
  })

  // 4. Aggregate stats for avg attempts / correct rate
  const aggStats = await prisma.studentObjectiveProgress.groupBy({
    by: ['objectiveId'],
    where: { courseId },
    _avg: { attempts: true, correct: true },
    _count: { id: true },
  })

  const statMap = new Map(aggStats.map((s) => [s.objectiveId, s]))

  // 5. Build per-objective counts
  type MasteryCount = { mastered: number; struggling: number; not_started: number }
  const masteryMap = new Map<string, MasteryCount>()
  for (const row of grouped) {
    const cur = masteryMap.get(row.objectiveId) ?? {
      mastered: 0,
      struggling: 0,
      not_started: 0,
    }
    if (row.masteryLevel === 'mastered') cur.mastered = row._count.id
    else if (row.masteryLevel === 'struggling') cur.struggling = row._count.id
    else cur.not_started += row._count.id  // "not_started" + anything else
    masteryMap.set(row.objectiveId, cur)
  }

  // 6. Upsert a snapshot row for each objective
  await Promise.all(
    objectives.map(({ id: objectiveId }) => {
      const counts = masteryMap.get(objectiveId) ?? {
        mastered: 0,
        struggling: 0,
        not_started: totalStudents,
      }
      const stats = statMap.get(objectiveId)
      const avgAttempts = stats?._avg.attempts ?? 0
      const avgCorrect = stats?._avg.correct ?? 0
      const avgCorrectRate =
        avgAttempts > 0 ? Math.min(1, Math.max(0, avgCorrect / avgAttempts)) : 0

      return prisma.objectiveProgressSnapshot.upsert({
        where: { objectiveId_snapshotDate: { objectiveId, snapshotDate } },
        create: {
          objectiveId,
          courseId,
          snapshotDate,
          totalStudents,
          masteredCount: counts.mastered,
          strugglingCount: counts.struggling,
          notStartedCount: Math.max(0, totalStudents - counts.mastered - counts.struggling),
          avgAttempts,
          avgCorrectRate,
        },
        update: {
          totalStudents,
          masteredCount: counts.mastered,
          strugglingCount: counts.struggling,
          notStartedCount: Math.max(0, totalStudents - counts.mastered - counts.struggling),
          avgAttempts,
          avgCorrectRate,
        },
      })
    }),
  )
}

// ── 2. SessionInteractionPattern ─────────────────────────────────────────────

/**
 * Extract behavioral interaction patterns from a completed ToolSession using
 * Haiku.  Saves a SessionInteractionPattern row; safe to call once per session
 * (the @unique on sessionId prevents duplicates).
 *
 * Skip conditions:
 *   - Session has fewer than 4 user turns (too sparse for meaningful extraction)
 *   - Pattern already exists for this session
 */
export async function extractSessionInteractionPattern(sessionId: string): Promise<void> {
  // Guard: already extracted?
  const existing = await prisma.sessionInteractionPattern.findUnique({
    where: { sessionId },
    select: { id: true },
  })
  if (existing) return

  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    include: {
      tool: { select: { name: true, learningObjectives: true } },
      chatMessages: {
        orderBy: { createdAt: 'asc' },
        take: 30,
        select: { role: true, content: true },
      },
    },
  })
  if (!session) return

  const userTurns = session.chatMessages.filter((m) => m.role === 'user')
  if (userTurns.length < 4) return  // 5-turn fast-path gate

  const transcript = session.chatMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 400)}`)
    .join('\n\n')

  const objectives =
    session.tool.learningObjectives.length > 0
      ? session.tool.learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
      : 'General tool engagement'

  const prompt = `You are an educational data scientist analyzing a student's learning session.

Tool: "${session.tool.name}"
Learning objectives:
${objectives}

Session transcript (up to 30 messages):
${transcript}

Extract the following interaction pattern signals. Respond ONLY with valid JSON — no prose, no markdown.

{
  "primaryStrategy": "<one of: retrieval_practice | elaboration | passive_reading | confusion_recovery | transfer | null>",
  "questionDepth": <0.0–1.0 depth of student-initiated questions; 1.0 = deep analytical, 0.0 = surface/factual | null>,
  "helpSeekingRatio": <fraction of student turns that were help-seeking 0.0–1.0 | null>,
  "conceptsApplied": ["<concept the student actively applied or connected to other ideas>"],
  "errorPatterns": ["<recurring error type>"],
  "breakthroughTurn": <turn number (1-indexed student turns) where comprehension shift detected | null>,
  "scaffoldingAccepted": <true if student engaged with scaffolding prompts | false if ignored | null if none offered>
}

Rules:
- conceptsApplied: max 6 items; only higher-order application (not mere recall); empty array if none
- errorPatterns: max 4 items; only repeated patterns (≥2 occurrences); empty array if none
- All floats must be in range [0.0, 1.0]
- Return null for any field you cannot determine with confidence`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const parsed = parseInteractionPattern(text)

    await prisma.sessionInteractionPattern.create({
      data: {
        sessionId,
        userId: session.userId ?? '',
        toolId: session.toolId,
        courseId: session.courseId ?? null,
        primaryStrategy: parsed.primaryStrategy,
        questionDepth: parsed.questionDepth,
        helpSeekingRatio: parsed.helpSeekingRatio,
        conceptsApplied: parsed.conceptsApplied,
        errorPatterns: parsed.errorPatterns,
        breakthroughTurn: parsed.breakthroughTurn,
        scaffoldingAccepted: parsed.scaffoldingAccepted,
        patternJson: parsed.patternJson as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    console.error(`[effectiveness-engine] Pattern extraction failed for session ${sessionId}:`, err)
    // Non-fatal — session scoring is independent
  }
}

function parseInteractionPattern(text: string): InteractionPatternResult {
  const VALID_STRATEGIES = new Set([
    'retrieval_practice', 'elaboration', 'passive_reading',
    'confusion_recovery', 'transfer',
  ])
  try {
    const raw = JSON.parse(text.trim()) as Record<string, unknown>
    const clamp = (v: unknown): number | null => {
      const n = Number(v)
      return isNaN(n) ? null : Math.min(1, Math.max(0, n))
    }
    return {
      primaryStrategy:
        typeof raw.primaryStrategy === 'string' && VALID_STRATEGIES.has(raw.primaryStrategy)
          ? raw.primaryStrategy
          : null,
      questionDepth: clamp(raw.questionDepth),
      helpSeekingRatio: clamp(raw.helpSeekingRatio),
      conceptsApplied: Array.isArray(raw.conceptsApplied)
        ? (raw.conceptsApplied as unknown[]).filter((c): c is string => typeof c === 'string').slice(0, 6)
        : [],
      errorPatterns: Array.isArray(raw.errorPatterns)
        ? (raw.errorPatterns as unknown[]).filter((c): c is string => typeof c === 'string').slice(0, 4)
        : [],
      breakthroughTurn:
        typeof raw.breakthroughTurn === 'number' && raw.breakthroughTurn > 0
          ? Math.round(raw.breakthroughTurn)
          : null,
      scaffoldingAccepted:
        typeof raw.scaffoldingAccepted === 'boolean' ? raw.scaffoldingAccepted : null,
      patternJson: raw,
    }
  } catch {
    return {
      primaryStrategy: null,
      questionDepth: null,
      helpSeekingRatio: null,
      conceptsApplied: [],
      errorPatterns: [],
      breakthroughTurn: null,
      scaffoldingAccepted: null,
      patternJson: {},
    }
  }
}

// ── 3. ToolEffectivenessAggregate ─────────────────────────────────────────────

/**
 * Compute and upsert a ToolEffectivenessAggregate for a specific
 * tool × course × window.  The window is [windowEnd - windowDays, windowEnd].
 *
 * effectivenessScore composite:
 *   40% avgScore + 30% completionRate + 30% (masteryDelta mapped 0–1)
 */
export async function computeToolEffectivenessAggregate(
  toolId: string,
  courseId: string,
  windowDays = 7,
  windowEnd: Date = midnightUTC(new Date()),
): Promise<void> {
  const windowStart = new Date(windowEnd.getTime() - windowDays * 86_400_000)

  const sessions = await prisma.toolSession.findMany({
    where: {
      toolId,
      courseId,
      startedAt: { gte: windowStart, lt: windowEnd },
      sensitiveSession: false,
    },
    select: {
      id: true,
      userId: true,
      score: true,
      durationSeconds: true,
      exitReason: true,
    },
  })

  const sessionCount = sessions.length
  const uniqueStudentIds = new Set(sessions.map((s) => s.userId).filter(Boolean))
  const uniqueStudents = uniqueStudentIds.size

  if (sessionCount === 0) return  // no activity in window — skip

  const scoredSessions = sessions.filter((s) => s.score !== null)
  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredSessions.length
      : null

  const durSessions = sessions.filter((s) => s.durationSeconds !== null)
  const avgDurationSeconds =
    durSessions.length > 0
      ? Math.round(
          durSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / durSessions.length,
        )
      : null

  const completionRate =
    sessionCount > 0
      ? sessions.filter((s) => s.exitReason === 'completed').length / sessionCount
      : null

  // Mastery delta: average change in objective mastery for students who used this tool
  // Proxy: average masteryDelta = (correct - previous correct) / attempts, approximated
  // via StudentObjectiveProgress.updatedAt within the window
  const masteryDelta = await computeMasteryDelta(
    courseId,
    Array.from(uniqueStudentIds).filter((id): id is string => id !== null),
    windowStart,
    windowEnd,
  )

  // Composite effectiveness score
  const effectivenessScore = computeEffectivenessScore(
    avgScore,
    completionRate,
    masteryDelta,
  )

  await prisma.toolEffectivenessAggregate.upsert({
    where: { toolId_courseId_windowEnd: { toolId, courseId, windowEnd } },
    create: {
      toolId,
      courseId,
      windowStart,
      windowEnd,
      sessionCount,
      uniqueStudents,
      avgScore,
      avgDurationSeconds,
      completionRate,
      masteryDelta,
      effectivenessScore,
    },
    update: {
      windowStart,
      sessionCount,
      uniqueStudents,
      avgScore,
      avgDurationSeconds,
      completionRate,
      masteryDelta,
      effectivenessScore,
      computedAt: new Date(),
    },
  })
}

async function computeMasteryDelta(
  courseId: string,
  studentIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<number | null> {
  if (studentIds.length === 0) return null

  // Objectives updated in the window for these students
  const updated = await prisma.studentObjectiveProgress.findMany({
    where: {
      courseId,
      studentId: { in: studentIds },
      updatedAt: { gte: windowStart, lt: windowEnd },
    },
    select: { attempts: true, correct: true },
  })
  if (updated.length === 0) return null

  const withAttempts = updated.filter((r) => r.attempts > 0)
  if (withAttempts.length === 0) return null

  const avgRate =
    withAttempts.reduce((sum, r) => sum + r.correct / r.attempts, 0) / withAttempts.length
  // Normalise to a delta relative to 0.5 baseline (0 = below average, positive = above)
  return Math.round((avgRate - 0.5) * 100) / 100
}

function computeEffectivenessScore(
  avgScore: number | null,
  completionRate: number | null,
  masteryDelta: number | null,
): number | null {
  const parts: Array<{ weight: number; value: number }> = []
  if (avgScore !== null) parts.push({ weight: 0.4, value: avgScore })
  if (completionRate !== null) parts.push({ weight: 0.3, value: completionRate })
  if (masteryDelta !== null) {
    // map masteryDelta from [-0.5, +0.5] to [0, 1]
    parts.push({ weight: 0.3, value: Math.min(1, Math.max(0, masteryDelta + 0.5)) })
  }
  if (parts.length === 0) return null
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  return (
    Math.round(
      (parts.reduce((s, p) => s + p.weight * p.value, 0) / totalWeight) * 100,
    ) / 100
  )
}

// ── 4. Nightly Rollup Orchestrator ────────────────────────────────────────────

/**
 * Recompute aggregates for all tool × course pairs that have new sessions since
 * the last rollup.  Also snapshots objectives for every course that had activity.
 *
 * Called by: /api/cron/effectiveness-rollup
 *
 * @param since - only consider sessions started after this timestamp; defaults
 *                to 25 hours ago (overlapping window to catch late-arriving data)
 */
export async function rollupAggregates(
  since?: Date,
): Promise<{ aggregatesComputed: number; snapshotsComputed: number }> {
  const cutoff = since ?? new Date(Date.now() - 25 * 3_600_000)
  const windowEnd = midnightUTC(new Date())

  // 1. Find all (toolId, courseId) pairs with new sessions
  const activePairs = await prisma.toolSession.findMany({
    where: {
      startedAt: { gte: cutoff },
      sensitiveSession: false,
      courseId: { not: null },
    },
    distinct: ['toolId', 'courseId'],
    select: { toolId: true, courseId: true },
  })

  // 2. Recompute 7-day aggregate for each pair
  const aggregateJobs = activePairs.map(({ toolId, courseId }) =>
    computeToolEffectivenessAggregate(toolId, courseId!, 7, windowEnd).catch((err) =>
      console.error(`[effectiveness-engine] Aggregate failed (${toolId}/${courseId}):`, err),
    ),
  )

  // 3. Snapshot objectives for every active course
  const activeCourseIds = [...new Set(activePairs.map((p) => p.courseId!))]
  const snapshotJobs = activeCourseIds.map((courseId) =>
    computeObjectiveProgressSnapshot(courseId, windowEnd).catch((err) =>
      console.error(`[effectiveness-engine] Snapshot failed (${courseId}):`, err),
    ),
  )

  await Promise.all([...aggregateJobs, ...snapshotJobs])
  const aggregatesComputed = aggregateJobs.length
  const snapshotsComputed = snapshotJobs.length
  console.info(
    `[effectiveness-engine] Rollup complete: ${aggregatesComputed} aggregates, ` +
      `${snapshotsComputed} course snapshots`,
  )
  return { aggregatesComputed, snapshotsComputed }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function midnightUTC(d: Date): Date {
  const m = new Date(d)
  m.setUTCHours(0, 0, 0, 0)
  return m
}
