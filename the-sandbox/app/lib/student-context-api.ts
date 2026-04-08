/**
 * student-context-api.ts
 *
 * Structured student context for API consumers and Sandy prompt injection.
 * Returns JSON (not a string) for flexible downstream use.
 * FERPA: only called for STUDENT role, never exposed to EDUCATOR/ADMIN.
 */

import { prisma } from './prisma'
import { getConceptMasteries, type EnrichedMastery } from './concept-mastery-service'
import { getEpisodicMemory } from './episodic-memory-service'
import { getDueConcepts } from './sr-scheduler'

export interface StudentContextData {
  profile: {
    preferredModality: string | null
    riskScore: number | null
    learningVelocity: number | null
    dominantBloomLevel: number | null
    avgCognitiveLoad: number | null
    topConceptsThisWeek: string[]
    peakEngagementHour: number | null
    lastSessionAt: string | null
  } | null
  weakConcepts: { concept: string; effectiveMastery: number; isStale: boolean; encounterCount: number; lastSeenAt: string }[]
  strongConcepts: { concept: string; effectiveMastery: number; encounterCount: number }[]
  domainModality: { domain: string; preferredModality: string; confidenceScore: number } | null
  recentSessions: { toolName: string; courseCode: string | null; score: number | null; conceptsTouched: string[]; createdAt: string }[]
  dueConcepts: { conceptSlug: string; missedReviews: number; bloomHighWater: number | null }[]
}

export async function getStudentContextJSON(
  userId: string,
  courseId?: string,
): Promise<StudentContextData> {
  // Resolve courseCode for domain modality lookup
  let courseCode: string | null = null
  if (courseId) {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { courseCode: true },
      })
      courseCode = course?.courseCode ?? null
    } catch { /* ignore */ }
  }

  const [profileResult, masteriesResult, domainModalityResult, episodicResult, dueResult] =
    await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId } }).catch(() => null),

      getConceptMasteries(userId).catch((): EnrichedMastery[] => []),

      courseCode
        ? prisma.studentDomainModality
            .findFirst({ where: { userId, domain: courseCode } })
            .catch(() => null)
        : Promise.resolve(null),

      getEpisodicMemory(userId, [], 5).catch(() => []),

      getDueConcepts(userId).catch(() => []),
    ])

  // Split masteries into weak/strong
  const weakConcepts = masteriesResult
    .filter((m) => m.effectiveMastery < 0.5)
    .sort((a, b) => a.effectiveMastery - b.effectiveMastery)
    .slice(0, 5)
    .map((m) => ({
      concept: m.concept,
      effectiveMastery: m.effectiveMastery,
      isStale: m.isStale,
      encounterCount: m.encounterCount,
      lastSeenAt: m.lastSeenAt.toISOString(),
    }))

  const strongConcepts = masteriesResult
    .filter((m) => m.effectiveMastery >= 0.7)
    .sort((a, b) => b.effectiveMastery - a.effectiveMastery)
    .slice(0, 5)
    .map((m) => ({
      concept: m.concept,
      effectiveMastery: m.effectiveMastery,
      encounterCount: m.encounterCount,
    }))

  const profile = profileResult
    ? {
        preferredModality: profileResult.preferredModality,
        riskScore: profileResult.riskScore,
        learningVelocity: profileResult.learningVelocity,
        dominantBloomLevel: profileResult.dominantBloomLevel,
        avgCognitiveLoad: profileResult.avgCognitiveLoad,
        topConceptsThisWeek: profileResult.topConceptsThisWeek,
        peakEngagementHour: profileResult.peakEngagementHour,
        lastSessionAt: profileResult.lastSessionAt?.toISOString() ?? null,
      }
    : null

  const domainModality = domainModalityResult
    ? {
        domain: domainModalityResult.domain,
        preferredModality: domainModalityResult.preferredModality,
        confidenceScore: domainModalityResult.confidenceScore,
      }
    : null

  const recentSessions = episodicResult.map((s) => ({
    toolName: s.toolName,
    courseCode: s.courseCode === 'General' ? null : s.courseCode,
    score: s.score,
    conceptsTouched: s.conceptsOverlap,
    createdAt: s.createdAt.toISOString(),
  }))

  const dueConcepts = dueResult.slice(0, 5).map((d) => ({
    conceptSlug: d.conceptSlug,
    missedReviews: d.daysOverdue,
    bloomHighWater: d.bloomHighWater,
  }))

  return {
    profile,
    weakConcepts,
    strongConcepts,
    domainModality,
    recentSessions,
    dueConcepts,
  }
}

export async function getStudentContextForTool(
  userId: string,
  courseId?: string,
): Promise<string> {
  const ctx = await getStudentContextJSON(userId, courseId)

  const lines: string[] = []

  // Weak concepts
  if (ctx.weakConcepts.length > 0) {
    const parts = ctx.weakConcepts.map(
      (c) => `${c.concept} (${Math.round(c.effectiveMastery * 100)}%)`,
    )
    lines.push(`Weak concepts: ${parts.join(', ')}`)
  }

  // Stale concepts
  const stale = ctx.weakConcepts.filter((c) => c.isStale)
  if (stale.length > 0) {
    const parts = stale.map((c) => `${c.concept} (now ${Math.round(c.effectiveMastery * 100)}%)`)
    lines.push(`Stale (needs review): ${parts.join(', ')}`)
  }

  // Domain modality
  if (ctx.domainModality) {
    lines.push(
      `Preferred modality: ${ctx.domainModality.preferredModality} (${Math.round(ctx.domainModality.confidenceScore * 100)}% confidence)`,
    )
  }

  // Risk + velocity
  if (ctx.profile?.riskScore != null) {
    const level = ctx.profile.riskScore > 0.7 ? 'high' : ctx.profile.riskScore > 0.4 ? 'moderate' : 'low'
    const pct = Math.round(ctx.profile.riskScore * 100)
    let velocityPart = ''
    if (ctx.profile.learningVelocity != null) {
      const trend =
        ctx.profile.learningVelocity > 0.05
          ? 'improving'
          : ctx.profile.learningVelocity < -0.05
            ? 'declining'
            : 'stable'
      velocityPart = ` Velocity: ${trend}.`
    }
    lines.push(`Risk: ${level} (${pct}%).${velocityPart}`)
  }

  // Recent session
  if (ctx.recentSessions.length > 0) {
    const recent = ctx.recentSessions[0]
    if (recent.score != null) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(recent.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      )
      lines.push(
        `Recent: scored ${Math.round(recent.score * 100)}% on "${recent.toolName}" ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago.`,
      )
    }
  }

  // SR due
  if (ctx.dueConcepts.length > 0) {
    lines.push(`SR due: ${ctx.dueConcepts.length} concept${ctx.dueConcepts.length !== 1 ? 's' : ''} overdue for review.`)
  }

  if (lines.length === 0) return ''

  return `\n\n[STUDENT LEARNING CONTEXT — use to personalize, never recite]\n${lines.join('\n')}`
}
