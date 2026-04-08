import { prisma } from '../prisma'
import { generateWeeklyPulse } from './weekly-pulse'
import { compareSections, persistCrossSectionComparisons } from './cross-section-service'
import { measureInterventionOutcomes } from './intervention-tracker'

// ─── Main Orchestrator ─────────────────────────────────────────────────────

/** Run the full Classroom Intelligence Loop across all published courses */
export async function runClassroomIntelligenceLoop(): Promise<{
  pulsesGenerated: number
  insightsGenerated: number
  interventionsMeasured: number
  crossSectionCodes: string[]
}> {
  // 1. Get all published courses
  const courses = await prisma.course.findMany({
    where: { isPublic: true },
    select: { id: true, courseCode: true },
  })

  let pulsesGenerated = 0
  let insightsGenerated = 0
  let interventionsMeasured = 0
  const crossSectionCodesSet = new Set<string>()

  // 2. Generate weekly pulses (sequential, with try/catch per course)
  for (const course of courses) {
    try {
      const pulse = await generateWeeklyPulse(course.id)
      pulsesGenerated++
      insightsGenerated += pulse.insightCount
    } catch (err) {
      console.error(`[ClassroomIntelligence] Pulse failed for course ${course.id}:`, err)
    }
  }

  // 3. Measure intervention outcomes
  try {
    const result = await measureInterventionOutcomes()
    interventionsMeasured = result.measured
  } catch (err) {
    console.error('[ClassroomIntelligence] Intervention measurement failed:', err)
  }

  // 4. Run cross-section comparisons per unique courseCode prefix
  const semesterCode = getCurrentSemester()
  const prefixes = new Set<string>()

  for (const course of courses) {
    // Extract base code: "CS-101-001" → "CS-101"
    const parts = course.courseCode.split('-')
    if (parts.length >= 2) {
      prefixes.add(parts.slice(0, -1).join('-'))
    }
  }

  for (const prefix of prefixes) {
    try {
      const insights = await compareSections(prefix, semesterCode)
      if (insights.length > 0) {
        await persistCrossSectionComparisons(prefix, semesterCode, insights)
        crossSectionCodesSet.add(prefix)
      }
    } catch (err) {
      console.error(`[ClassroomIntelligence] Cross-section failed for ${prefix}:`, err)
    }
  }

  return {
    pulsesGenerated,
    insightsGenerated,
    interventionsMeasured,
    crossSectionCodes: Array.from(crossSectionCodesSet),
  }
}

// ─── Insight Card Queries ──────────────────────────────────────────────────

/** Get insight cards for an instructor with optional filters */
export async function getInsightCards(
  instructorId: string,
  options: {
    courseId?: string
    type?: string
    viewed?: boolean
    limit?: number
  } = {},
) {
  const { courseId, type, viewed, limit = 20 } = options
  const now = new Date()

  return prisma.instructorInsightCard.findMany({
    where: {
      instructorId,
      ...(courseId && { courseId }),
      ...(type && { type: type as any }),
      ...(viewed !== undefined && { viewed }),
      expiresAt: { gte: now },
    },
    include: {
      course: { select: { title: true } },
    },
    orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  })
}

/** Mark an insight card as viewed */
export async function viewInsightCard(cardId: string) {
  return prisma.instructorInsightCard.update({
    where: { id: cardId },
    data: {
      viewed: true,
      viewedAt: new Date(),
    },
  })
}

// ─── Pulse History ─────────────────────────────────────────────────────────

/** Get pulse history for a course */
export async function getPulseHistory(courseId: string, weeks = 12) {
  return prisma.teachingPulse.findMany({
    where: { courseId },
    orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
    take: weeks,
  })
}

// ─── Sandy Integration ─────────────────────────────────────────────────────

/** Build Sandy context block with unread insights and latest pulse */
export async function buildSandyClassroomContext(
  courseId: string,
  instructorId: string,
): Promise<string> {
  const [unreadCards, latestPulse] = await Promise.all([
    prisma.instructorInsightCard.findMany({
      where: {
        instructorId,
        courseId,
        viewed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
      take: 3,
      include: { course: { select: { title: true } } },
    }),
    prisma.teachingPulse.findFirst({
      where: { courseId },
      orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
    }),
  ])

  const parts: string[] = ['<classroom-intelligence>']

  if (latestPulse) {
    parts.push('<latest-pulse>')
    parts.push(`Week ${latestPulse.weekNumber}, ${latestPulse.yearNumber}`)
    if (latestPulse.narrativeSummary) parts.push(latestPulse.narrativeSummary)
    if (latestPulse.topStruggle) parts.push(`Top struggle: ${latestPulse.topStruggle}`)
    if (latestPulse.topImprovement) parts.push(`Top improvement: ${latestPulse.topImprovement}`)
    if (latestPulse.avgScore !== null) parts.push(`Avg score: ${Math.round(latestPulse.avgScore * 100)}%`)
    if (latestPulse.submissionRate !== null) parts.push(`Submission rate: ${Math.round(latestPulse.submissionRate * 100)}%`)
    parts.push('</latest-pulse>')
  }

  if (unreadCards.length > 0) {
    parts.push('<unread-insights>')
    for (const card of unreadCards) {
      parts.push(`[${card.urgency}] ${card.title}: ${card.body.slice(0, 200)}`)
    }
    parts.push('</unread-insights>')
  }

  parts.push('</classroom-intelligence>')
  return parts.join('\n')
}

/** Build a short briefing summary for the homepage briefing widget */
export async function buildBriefingClassroomSummary(
  courseId: string,
): Promise<string | null> {
  const [latestPulse, unreadCount] = await Promise.all([
    prisma.teachingPulse.findFirst({
      where: { courseId },
      orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
      select: { narrativeSummary: true },
    }),
    prisma.instructorInsightCard.count({
      where: {
        courseId,
        viewed: false,
        expiresAt: { gte: new Date() },
      },
    }),
  ])

  if (!latestPulse?.narrativeSummary && unreadCount === 0) return null

  const parts: string[] = []
  if (latestPulse?.narrativeSummary) {
    parts.push(latestPulse.narrativeSummary)
  }
  if (unreadCount > 0) {
    parts.push(`${unreadCount} unread insight${unreadCount === 1 ? '' : 's'} waiting for review.`)
  }

  return parts.join(' ')
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Determine the current semester code based on month */
export function getCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-indexed
  const year = now.getFullYear()

  if (month >= 1 && month <= 5) return `SP${year}`
  if (month >= 6 && month <= 8) return `SU${year}`
  return `FA${year}`
}
