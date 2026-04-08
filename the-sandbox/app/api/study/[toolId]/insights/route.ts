import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { getConceptMasteries } from '../../../../lib/concept-mastery-service'
import { getDueConcepts } from '../../../../lib/sr-scheduler'

/**
 * GET /api/study/[toolId]/insights?courseId=xxx
 *
 * Aggregates Study Buddy analytics for the insights dashboard:
 * - Concept mastery bars (with decay)
 * - SR forecast (due today/tomorrow/week)
 * - Session history (last 20 sessions)
 * - Study habits (sessions/week, avg duration, peak hour, mode distribution)
 * - Mastery trend (weekly averages over last 30 days)
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  const { toolId } = await params
  const courseId = req.nextUrl.searchParams.get('courseId')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Run all queries in parallel
  const [
    conceptMasteries,
    dueConcepts,
    sessions,
    profile,
    flashcardDueNow,
    flashcardDueTomorrow,
    flashcardDueWeek,
    flashcardTotal,
  ] = await Promise.all([
    getConceptMasteries(user.id).catch(() => []),
    getDueConcepts(user.id, courseId ?? undefined).catch(() => []),

    // Recent sessions for this tool
    prisma.toolSession.findMany({
      where: {
        userId: user.id,
        ...(courseId ? { courseId } : {}),
        messageCount: { gt: 0 },
        startedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { startedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        score: true,
        startedAt: true,
        durationSeconds: true,
        conceptsTouched: true,
        bloomLevel: true,
        qualitySignal: true,
        messageCount: true,
        tool: { select: { name: true, toolType: true } },
      },
    }).catch(() => []),

    // Student profile
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: {
        preferredModality: true,
        riskScore: true,
        learningVelocity: true,
        dominantBloomLevel: true,
        avgCognitiveLoad: true,
        peakEngagementHour: true,
        totalSessionCount: true,
        lastSessionAt: true,
        srDueCount: true,
      },
    }).catch(() => null),

    // SR flashcard counts
    courseId ? prisma.flashcardState.count({
      where: { userId: user.id, courseId, nextReviewAt: { lte: now } },
    }).catch(() => 0) : Promise.resolve(0),
    courseId ? prisma.flashcardState.count({
      where: { userId: user.id, courseId, nextReviewAt: { lte: tomorrow, gt: now } },
    }).catch(() => 0) : Promise.resolve(0),
    courseId ? prisma.flashcardState.count({
      where: { userId: user.id, courseId, nextReviewAt: { lte: weekFromNow, gt: tomorrow } },
    }).catch(() => 0) : Promise.resolve(0),
    courseId ? prisma.flashcardState.count({
      where: { userId: user.id, courseId },
    }).catch(() => 0) : Promise.resolve(0),
  ])

  // Build concept mastery list (weak + strong, sorted)
  const concepts = conceptMasteries
    .map(m => ({
      concept: m.concept,
      mastery: Math.round(m.effectiveMastery * 100),
      isStale: m.isStale,
      encounterCount: m.encounterCount,
      lastSeenAt: m.lastSeenAt.toISOString(),
    }))
    .sort((a, b) => a.mastery - b.mastery)

  // Build mastery trend (weekly averages)
  const weekBuckets: { week: string; avgScore: number; sessions: number }[] = []
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const weekSessions = sessions.filter(s => {
      const d = new Date(s.startedAt)
      return d >= weekStart && d < weekEnd
    })
    const scored = weekSessions.filter(s => s.score != null)
    const avg = scored.length > 0
      ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) * 100)
      : 0
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    weekBuckets.push({ week: label, avgScore: avg, sessions: weekSessions.length })
  }

  // Study habits
  const totalSessions = sessions.length
  const sessionsThisWeek = sessions.filter(s =>
    new Date(s.startedAt).getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).length
  const avgDurationMin = sessions.length > 0
    ? Math.round(sessions.reduce((s, sess) => s + (sess.durationSeconds ?? 0), 0) / sessions.length / 60)
    : 0

  // Mode distribution
  const modeCounts: Record<string, number> = {}
  for (const s of sessions) {
    const mode = s.tool.toolType === 'STUDY_BUDDY' ? 'Study Buddy' : s.tool.name
    modeCounts[mode] = (modeCounts[mode] || 0) + 1
  }
  const topModes = Object.entries(modeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }))

  // Session history (formatted for display)
  const sessionHistory = sessions.slice(0, 20).map(s => ({
    id: s.id,
    toolName: s.tool.name,
    score: s.score != null ? Math.round(s.score * 100) : null,
    startedAt: s.startedAt.toISOString(),
    durationMin: s.durationSeconds ? Math.round(s.durationSeconds / 60) : null,
    conceptsTouched: s.conceptsTouched.slice(0, 5),
    bloomLevel: s.bloomLevel,
    messageCount: s.messageCount,
  }))

  return NextResponse.json({
    concepts,
    masteryTrend: weekBuckets,
    srForecast: {
      dueNow: flashcardDueNow,
      dueTomorrow: flashcardDueTomorrow,
      dueThisWeek: flashcardDueWeek,
      totalCards: flashcardTotal,
      conceptsDue: dueConcepts.slice(0, 5).map(d => ({
        slug: d.conceptSlug,
        daysOverdue: d.daysOverdue,
        hints: d.remediationHints.slice(0, 1),
      })),
    },
    habits: {
      totalSessions,
      sessionsThisWeek,
      avgDurationMin,
      peakHour: profile?.peakEngagementHour ?? null,
      topModes,
      bloomLevel: profile?.dominantBloomLevel ?? null,
      velocity: profile?.learningVelocity ?? null,
      riskScore: profile?.riskScore ?? null,
    },
    sessionHistory,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
