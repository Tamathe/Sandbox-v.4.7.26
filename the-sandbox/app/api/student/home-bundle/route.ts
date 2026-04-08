// PERF-AUDIT (Sprint 4, 2026-04-04): Bundle approach is STILL OPTIMAL. This is the
// heaviest bundle (8 concurrent fetches via Promise.allSettled): enrollments, spaced
// repetition nudge, community pulse, email insights, draft tools, UKNow events,
// first-run prefs, and virtual-clinic count. All are user-specific except UKNow events
// and community pulse. Splitting UKNow/pulse into a shared public endpoint could save
// ~2 DB queries per student, but the wins are marginal — these are fast queries and
// SWR already prevents re-fetching within a session. The N+1 conceptState query was
// fixed in Sprint 1 (batched findMany). No changes needed.
//
// ─── Student Homepage Bundle ────────────────────────────────────
// GET /api/student/home-bundle
// Consolidates 6 individual API calls into one request.

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { generateEmailInsights } from '../../../lib/assistant/email-insight-service'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

async function getStudentEnrollments(userId: string) {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    include: {
      course: {
        select: {
          id: true,
          courseCode: true,
          title: true,
          instructor: { select: { name: true } },
        },
      },
    },
  })

  const courseIds = enrollments.map(e => e.courseId)
  const allConcepts = await prisma.conceptState.findMany({
    where: { courseId: { in: courseIds }, userId },
    select: { courseId: true, bloomHighWater: true },
  })

  const conceptsByCourse = new Map<string, { bloomHighWater: number | null }[]>()
  for (const c of allConcepts) {
    const arr = conceptsByCourse.get(c.courseId) ?? []
    arr.push(c)
    conceptsByCourse.set(c.courseId, arr)
  }

  return enrollments.map(e => {
    const concepts = conceptsByCourse.get(e.courseId) ?? []
    const mastered = concepts.filter(c => (c.bloomHighWater ?? 0) >= 4).length
    const struggling = concepts.filter(c => (c.bloomHighWater ?? 0) <= 2).length
    return {
      courseId: e.courseId,
      courseCode: e.course.courseCode,
      title: e.course.title,
      instructorName: e.course.instructor?.name ?? 'TBD',
      mastered,
      struggling,
      total: concepts.length,
    }
  })
}

async function getSRNudge(userId: string) {
  const now = new Date()
  const dueConcepts = await prisma.conceptState.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
      missedReviews: { lte: 10 },
      course: {
        toolSessions: {
          some: { userId, sensitiveSession: false },
        },
      },
    },
    include: { course: { select: { courseCode: true } } },
    orderBy: { nextReviewAt: 'asc' },
  })

  return {
    dueCount: dueConcepts.length,
    overdueCount: dueConcepts.filter(c => c.missedReviews > 0).length,
    dueConcepts: dueConcepts.slice(0, 5).map(c => ({
      conceptSlug: c.conceptSlug,
      courseCode: c.course.courseCode,
      bloomHighWater: c.bloomHighWater ?? 1,
      missedReviews: c.missedReviews,
      nextReviewAt: c.nextReviewAt.toISOString(),
    })),
  }
}

async function getCommunityPulse(userId: string) {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [activeRooms, challengeCount, totalParticipants] = await Promise.all([
    prisma.liveRoom.findMany({
      where: { phase: { not: 'COMPLETE' } },
      include: {
        host: { select: { name: true } },
        participants: {
          select: { user: { select: { id: true, name: true } } },
        },
        channel: { select: { group: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.liveRoom.count({
      where: { type: 'CHALLENGE', createdAt: { gte: oneDayAgo } },
    }),
    prisma.liveRoomParticipant.count({
      where: { room: { createdAt: { gte: oneDayAgo } } },
    }),
  ])

  const studyRoomCount = activeRooms.filter(r => r.type === 'STUDY').length
  const studyParticipantCount = activeRooms
    .filter(r => r.type === 'STUDY')
    .reduce((sum, r) => sum + r.participants.length, 0)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thesandbox.uky.edu'

  return {
    activeRooms: activeRooms.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      phase: r.phase,
      hostName: r.host.name,
      groupName: r.channel?.group?.name ?? 'Unknown',
      participantCount: r.participants.length,
      participants: r.participants.slice(0, 5).map(p => p.user.name),
      shareUrl: `${baseUrl}/join-room/${r.id}`,
    })),
    stats: {
      activeStudyRooms: studyRoomCount,
      activeStudiers: studyParticipantCount,
      challengesToday: challengeCount,
      participantsToday: totalParticipants,
    },
  }
}

async function getDraftTools(userId: string) {
  return prisma.tool.findMany({
    where: { creatorId: userId, published: false },
    select: {
      id: true,
      name: true,
      shortDescription: true,
      category: true,
      toolType: true,
      thumbnailUrl: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 4,
  })
}

// Existing users who already had a SandyPreference before this feature
// are grandfathered to "full" view on first load post-deploy
const FIRST_RUN_DEPLOY_DATE = new Date('2026-04-10T00:00:00Z')

async function getFirstRunPrefs(userId: string) {
  const existing = await prisma.sandyPreference.findUnique({
    where: { userId },
    select: { homepageView: true, sandyIntroSeen: true },
  })

  if (existing) {
    // Grandfathering: if homepageView is still the column default "focus" and
    // intro hasn't been seen, check if user predates the deploy. If so, silently
    // upgrade them to "full" so they don't see a simplified homepage unexpectedly.
    if (existing.homepageView === 'focus' && !existing.sandyIntroSeen) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      })
      if (user && user.createdAt < FIRST_RUN_DEPLOY_DATE) {
        await prisma.sandyPreference.update({
          where: { userId },
          data: { homepageView: 'full', sandyIntroSeen: true },
        })
        return { homepageView: 'full' as const, sandyIntroSeen: true }
      }
    }
    return existing
  }

  // Lazy-create with defaults (new user → focus view + intro not seen)
  // Uses upsert to avoid race with concurrent preferences fetch
  const created = await prisma.sandyPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { homepageView: true, sandyIntroSeen: true },
  })
  return created
}

async function getUKNowEvents() {
  const articles = await prisma.uKNowArticle.findMany({
    where: { section: 'Events' },
    select: {
      id: true,
      title: true,
      sectionLabel: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: 2,
  })
  return articles
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const userId = auth.user.id

  const [enrollmentsRes, srNudgeRes, pulseRes, emailRes, draftsRes, uknowRes, prefsRes, vcCountRes] =
    await Promise.allSettled([
      getStudentEnrollments(userId),
      getSRNudge(userId),
      getCommunityPulse(userId),
      generateEmailInsights(userId),
      getDraftTools(userId),
      getUKNowEvents(),
      getFirstRunPrefs(userId),
      prisma.clinicalEncounter.count({ where: { userId, completedAt: { not: null } } }),
    ])

  const prefs = prefsRes.status === 'fulfilled' ? prefsRes.value : { homepageView: 'focus', sandyIntroSeen: false }

  return NextResponse.json({
    enrollments: enrollmentsRes.status === 'fulfilled' ? enrollmentsRes.value : [],
    srNudge: srNudgeRes.status === 'fulfilled' ? srNudgeRes.value : { dueCount: 0, overdueCount: 0, dueConcepts: [] },
    communityPulse: pulseRes.status === 'fulfilled' ? pulseRes.value : { activeRooms: [], stats: { activeStudyRooms: 0, activeStudiers: 0, challengesToday: 0, participantsToday: 0 } },
    emailInsights: emailRes.status === 'fulfilled' ? emailRes.value : [],
    draftTools: draftsRes.status === 'fulfilled' ? draftsRes.value : [],
    uknowEvents: uknowRes.status === 'fulfilled' ? uknowRes.value : [],
    homepageView: prefs.homepageView,
    sandyIntroSeen: prefs.sandyIntroSeen,
    vcEncounterCount: vcCountRes.status === 'fulfilled' ? vcCountRes.value : 0,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
