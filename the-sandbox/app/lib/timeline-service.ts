/**
 * timeline-service.ts
 *
 * Aggregates learning events from existing timestamped records into a unified
 * timeline for the Learning Time Machine feature. No new Prisma models —
 * everything is computed from ToolSession, StudentConceptMastery, TransferEvent,
 * ConceptState, and StudyPlanLog.
 *
 * FERPA: excludes sensitiveSession=true from all ToolSession queries.
 */

import { prisma } from './prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | 'session'
  | 'mastery_jump'
  | 'transfer'
  | 'misconception_cleared'
  | 'bloom_advance'
  | 'study_plan'

export interface TimelineEvent {
  id: string
  timestamp: string // ISO date
  type: TimelineEventType
  courseCode?: string
  title: string
  description: string
  magnitude: 'minor' | 'notable' | 'breakthrough'
  metadata: Record<string, unknown>
}

export interface TimelineStats {
  totalSessions: number
  conceptsMastered: number
  transferEvents: number
  misconceptionsOvercome: number
  bloomPeak: number
  longestStreak: number
}

export interface LearningTimeline {
  events: TimelineEvent[]
  stats: TimelineStats
  hasMore: boolean
}

export interface TimelineOptions {
  courseId?: string
  from?: Date
  to?: Date
  limit?: number  // default 50
  offset?: number // default 0
  types?: TimelineEventType[]
}

// ── Bloom label helper ───────────────────────────────────────────────────────

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function getTimeline(
  userId: string,
  options: TimelineOptions = {},
): Promise<LearningTimeline> {
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0
  const to = options.to ?? new Date()

  // Cap per-source fetch to avoid loading unbounded rows into memory
  const fetchCap = limit + offset

  // Gather all event types in parallel
  const [
    sessionEvents,
    masteryJumpEvents,
    transferEvents,
    misconceptionEvents,
    bloomEvents,
    studyPlanEvents,
    stats,
  ] = await Promise.all([
    getSessionEvents(userId, options.courseId, options.from, to, fetchCap),
    getMasteryJumpEvents(userId, options.courseId, fetchCap),
    getTransferEvents(userId, options.courseId, options.from, to, fetchCap),
    getMisconceptionClearedEvents(userId, options.courseId, fetchCap),
    getBloomAdvanceEvents(userId, options.courseId, fetchCap),
    getStudyPlanEvents(userId, options.courseId, options.from, to, fetchCap),
    computeStats(userId),
  ])

  // Merge all events
  let allEvents: TimelineEvent[] = [
    ...sessionEvents,
    ...masteryJumpEvents,
    ...transferEvents,
    ...misconceptionEvents,
    ...bloomEvents,
    ...studyPlanEvents,
  ]

  // Sort by timestamp DESC
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Apply type filter
  if (options.types && options.types.length > 0) {
    const typeSet = new Set(options.types)
    allEvents = allEvents.filter((e) => typeSet.has(e.type))
  }

  // Apply date filters
  if (options.from) {
    const fromMs = options.from.getTime()
    allEvents = allEvents.filter((e) => new Date(e.timestamp).getTime() >= fromMs)
  }
  {
    const toMs = to.getTime()
    allEvents = allEvents.filter((e) => new Date(e.timestamp).getTime() <= toMs)
  }

  const total = allEvents.length
  const paged = allEvents.slice(offset, offset + limit)

  return {
    events: paged,
    stats,
    hasMore: total > offset + limit,
  }
}

// ── Session events ───────────────────────────────────────────────────────────

async function getSessionEvents(
  userId: string,
  courseId?: string,
  from?: Date,
  to?: Date,
  cap = 200,
): Promise<TimelineEvent[]> {
  const sessions = await prisma.toolSession.findMany({
    where: {
      userId,
      sensitiveSession: false,
      qualitySignal: { in: ['strong', 'partial'] },
      score: { not: null },
      ...(courseId ? { courseId } : {}),
      ...(from || to
        ? {
            startedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      tool: { select: { name: true } },
      course: { select: { courseCode: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: cap,
  })

  return sessions.map((s) => ({
    id: `session-${s.id}`,
    timestamp: s.startedAt.toISOString(),
    type: 'session' as const,
    courseCode: s.course?.courseCode ?? undefined,
    title: `Completed ${s.tool.name} session`,
    description: `${s.qualitySignal} session — scored ${Math.round((s.score ?? 0) * 100)}% on ${
      s.conceptsTouched.length > 0 ? s.conceptsTouched.join(', ') : 'general concepts'
    }`,
    magnitude: (s.score ?? 0) >= 0.85 ? ('notable' as const) : ('minor' as const),
    metadata: {
      toolName: s.tool.name,
      score: s.score,
      qualitySignal: s.qualitySignal,
      conceptsTouched: s.conceptsTouched,
      bloomLevel: s.bloomLevel,
      courseCode: s.course?.courseCode ?? null,
    },
  }))
}

// ── Mastery jump events ──────────────────────────────────────────────────────

async function getMasteryJumpEvents(
  userId: string,
  courseId?: string,
  cap = 100,
): Promise<TimelineEvent[]> {
  // Fetch concepts with high mastery that had struggles (encounterCount - successCount >= 2)
  const masteries = await prisma.studentConceptMastery.findMany({
    where: {
      userId,
      masteryLevel: { gt: 0.75 },
      encounterCount: { gte: 3 },
      ...(courseId ? { coursesEncountered: { has: courseId } } : {}),
    },
    include: {
      firstCourse: { select: { courseCode: true } },
    },
    take: cap,
  })

  const events: TimelineEvent[] = []

  for (const m of masteries) {
    const successRate = m.successCount / m.encounterCount
    const failedAttempts = m.encounterCount - m.successCount

    // If success rate is high now but they had 2+ failures, this was a breakthrough
    if (successRate > 0.8 && failedAttempts >= 2) {
      // Approximate previous mastery: if they failed 2+ times out of N encounters,
      // before the last few successes mastery was lower
      const approxPreviousMastery = Math.max(0, (m.successCount - 2) / (m.encounterCount - 2))

      events.push({
        id: `mastery-jump-${m.id}`,
        timestamp: m.lastSeenAt.toISOString(),
        type: 'mastery_jump',
        courseCode: m.firstCourse?.courseCode ?? undefined,
        title: `Breakthrough on ${m.concept}!`,
        description: `Mastery jumped from ${Math.round(approxPreviousMastery * 100)}% to ${Math.round(m.masteryLevel * 100)}% after persistent effort`,
        magnitude: 'breakthrough',
        metadata: {
          concept: m.concept,
          previousMastery: approxPreviousMastery,
          newMastery: m.masteryLevel,
          courseCode: m.firstCourse?.courseCode ?? null,
          encounterCount: m.encounterCount,
          failedAttempts,
        },
      })
    }
  }

  return events
}

// ── Transfer events ──────────────────────────────────────────────────────────

async function getTransferEvents(
  userId: string,
  courseId?: string,
  from?: Date,
  to?: Date,
  cap = 100,
): Promise<TimelineEvent[]> {
  const transfers = await prisma.transferEvent.findMany({
    where: {
      userId,
      ...(courseId
        ? { OR: [{ sourceCourseId: courseId }, { targetCourseId: courseId }] }
        : {}),
      ...(from || to
        ? {
            detectedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      sourceCourse: { select: { courseCode: true } },
      targetCourse: { select: { courseCode: true } },
    },
    orderBy: { detectedAt: 'desc' },
    take: cap,
  })

  return transfers.map((t) => ({
    id: `transfer-${t.id}`,
    timestamp: t.detectedAt.toISOString(),
    type: 'transfer' as const,
    courseCode: t.targetCourse.courseCode,
    title: `Knowledge transferred: ${t.concept}`,
    description: `Applied ${t.concept} from ${t.sourceCourse.courseCode} in ${t.targetCourse.courseCode} — scored ${Math.round(t.sessionScore * 100)}%`,
    magnitude: 'breakthrough' as const,
    metadata: {
      concept: t.concept,
      sourceCourseCode: t.sourceCourse.courseCode,
      targetCourseCode: t.targetCourse.courseCode,
      sessionScore: t.sessionScore,
    },
  }))
}

// ── Misconception cleared events ─────────────────────────────────────────────

async function getMisconceptionClearedEvents(
  userId: string,
  courseId?: string,
  cap = 100,
): Promise<TimelineEvent[]> {
  // Find ConceptStates with fired misconceptions
  const states = await prisma.conceptState.findMany({
    where: {
      userId,
      firedMisconceptions: { isEmpty: false },
      ...(courseId ? { courseId } : {}),
    },
    include: {
      course: { select: { courseCode: true } },
    },
    take: cap,
  })

  if (states.length === 0) return []

  // Cross-reference with mastery to find cleared misconceptions
  const conceptSlugs = states.map((s) => s.conceptSlug)
  const masteries = await prisma.studentConceptMastery.findMany({
    where: {
      userId,
      concept: { in: conceptSlugs },
      masteryLevel: { gt: 0.7 },
    },
  })
  const masteredSet = new Set(masteries.map((m) => m.concept))

  const events: TimelineEvent[] = []

  for (const state of states) {
    if (masteredSet.has(state.conceptSlug)) {
      events.push({
        id: `misconception-${state.id}`,
        timestamp: state.updatedAt.toISOString(),
        type: 'misconception_cleared',
        courseCode: state.course.courseCode,
        title: `Misconception overcome: ${state.conceptSlug}`,
        description: `Previously struggled with ${state.firedMisconceptions.join(', ')} — now mastered`,
        magnitude: 'notable',
        metadata: {
          concept: state.conceptSlug,
          misconceptions: state.firedMisconceptions,
          courseCode: state.course.courseCode,
        },
      })
    }
  }

  return events
}

// ── Bloom advance events ─────────────────────────────────────────────────────

async function getBloomAdvanceEvents(
  userId: string,
  courseId?: string,
  cap = 100,
): Promise<TimelineEvent[]> {
  const states = await prisma.conceptState.findMany({
    where: {
      userId,
      bloomHighWater: { gte: 5 },
      ...(courseId ? { courseId } : {}),
    },
    include: {
      course: { select: { courseCode: true } },
    },
    take: cap,
  })

  return states.map((s) => {
    const level = s.bloomHighWater ?? 5
    return {
      id: `bloom-${s.id}`,
      timestamp: s.updatedAt.toISOString(),
      type: 'bloom_advance' as const,
      courseCode: s.course.courseCode,
      title: `Deep understanding: ${s.conceptSlug}`,
      description: `Reached Bloom level ${level} (${BLOOM_LABELS[level] ?? 'Advanced'}) on ${s.conceptSlug}`,
      magnitude: level >= 5 ? ('notable' as const) : ('minor' as const),
      metadata: {
        concept: s.conceptSlug,
        bloomLevel: level,
        bloomLabel: BLOOM_LABELS[level] ?? 'Advanced',
        courseCode: s.course.courseCode,
      },
    }
  })
}

// ── Study plan events ────────────────────────────────────────────────────────

async function getStudyPlanEvents(
  userId: string,
  courseId?: string,
  from?: Date,
  to?: Date,
  cap = 100,
): Promise<TimelineEvent[]> {
  const plans = await prisma.studyPlanLog.findMany({
    where: {
      userId,
      ...(courseId ? { courseId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      course: { select: { courseCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: cap,
  })

  return plans.map((p) => ({
    id: `study-plan-${p.id}`,
    timestamp: p.createdAt.toISOString(),
    type: 'study_plan' as const,
    courseCode: p.course?.courseCode ?? undefined,
    title: `Study plan created${p.course ? ` for ${p.course.courseCode}` : ''}`,
    description: `Targeting ${p.conceptsTargeted.length} concepts with ${p.stepsCount} steps`,
    magnitude: 'minor' as const,
    metadata: {
      planType: p.planType,
      conceptsTargeted: p.conceptsTargeted,
      stepsCount: p.stepsCount,
      courseCode: p.course?.courseCode ?? null,
    },
  }))
}

// ── Stats computation ────────────────────────────────────────────────────────

async function computeStats(userId: string): Promise<TimelineStats> {
  const [
    totalSessions,
    conceptsMastered,
    transferEventCount,
    misconceptionStates,
    bloomPeakResult,
    streakDates,
  ] = await Promise.all([
    // Total scored sessions (non-sensitive)
    prisma.toolSession.count({
      where: { userId, sensitiveSession: false, score: { not: null } },
    }),

    // Concepts with mastery > 0.75
    prisma.studentConceptMastery.count({
      where: { userId, masteryLevel: { gt: 0.75 } },
    }),

    // Transfer events
    prisma.transferEvent.count({ where: { userId } }),

    // Misconceptions overcome: ConceptState with fired misconceptions + mastery > 0.7
    getMisconceptionOvercomeCount(userId),

    // Bloom peak: max bloomHighWater across all ConceptState
    prisma.conceptState.findFirst({
      where: { userId, bloomHighWater: { not: null } },
      orderBy: { bloomHighWater: 'desc' },
      select: { bloomHighWater: true },
    }),

    // Streak: all session dates for consecutive-day calculation
    prisma.toolSession.findMany({
      where: { userId, sensitiveSession: false, score: { not: null } },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
    }),
  ])

  return {
    totalSessions,
    conceptsMastered,
    transferEvents: transferEventCount,
    misconceptionsOvercome: misconceptionStates,
    bloomPeak: bloomPeakResult?.bloomHighWater ?? 0,
    longestStreak: computeLongestStreak(streakDates.map((s) => s.startedAt)),
  }
}

async function getMisconceptionOvercomeCount(userId: string): Promise<number> {
  const states = await prisma.conceptState.findMany({
    where: { userId, firedMisconceptions: { isEmpty: false } },
    select: { conceptSlug: true },
  })

  if (states.length === 0) return 0

  const masteredCount = await prisma.studentConceptMastery.count({
    where: {
      userId,
      concept: { in: states.map((s) => s.conceptSlug) },
      masteryLevel: { gt: 0.7 },
    },
  })

  return masteredCount
}

function computeLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0

  // Build set of unique date strings (YYYY-MM-DD)
  const dateStrings = new Set<string>()
  for (const d of dates) {
    dateStrings.add(d.toISOString().slice(0, 10))
  }

  // Walk backwards from today counting consecutive days
  let longest = 0
  let current = 0
  const today = new Date()

  // Sort unique dates descending
  const sorted = Array.from(dateStrings).sort().reverse()

  if (sorted.length === 0) return 0

  // Start from most recent date
  let expectedDate = new Date(sorted[0])

  for (const ds of sorted) {
    const d = new Date(ds)
    const expected = expectedDate.toISOString().slice(0, 10)

    if (ds === expected) {
      current++
      longest = Math.max(longest, current)
      // Move expected back one day
      expectedDate = new Date(expectedDate)
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      // Gap found — start new streak from this date
      current = 1
      longest = Math.max(longest, current)
      expectedDate = new Date(d)
      expectedDate.setDate(expectedDate.getDate() - 1)
    }
  }

  return longest
}
