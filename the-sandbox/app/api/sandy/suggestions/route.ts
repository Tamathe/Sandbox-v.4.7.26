import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'
import { generatePageSuggestions } from '../../../lib/sandy-suggestions-service'
import type { SuggestionContext } from '../../../lib/sandy-suggestions-service'
import type { StudentIntelligence, SRContext, StudyPlanSummary, ConversationMemoryItem, ToolDetailContext } from '../../../lib/concierge-service'
import { differenceInDays } from 'date-fns'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const page = req.nextUrl.searchParams.get('page') || '/'
  const courseCode = req.nextUrl.searchParams.get('courseCode') || null
  const courseTitle = req.nextUrl.searchParams.get('courseTitle') || null

  const user = await prisma.user.findUnique({
    where: { email: auth.user.email },
    select: { id: true, name: true, role: true, department: true, college: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Gather context in parallel — all non-fatal
  const [
    studentIntelResult,
    srResult,
    studyPlanResult,
    memoryResult,
    toolDetailResult,
    fingerprintResult,
  ] = await Promise.allSettled([
    // Student intelligence
    user.role === 'STUDENT' ? getStudentIntelligence(user.id) : Promise.resolve(null),
    // SR context
    user.role === 'STUDENT' ? getSRContext(user.id) : Promise.resolve(null),
    // Study plan summary
    user.role === 'STUDENT' ? getStudyPlanSummary(user.id) : Promise.resolve(null),
    // Conversation memory
    getConversationMemory(user.id),
    // Tool detail context
    page.startsWith('/tools/') ? getToolDetail(page) : Promise.resolve(null),
    // Fingerprint summary
    getFingerprintSummary(user.id),
  ])

  const ctx: SuggestionContext = {
    currentPage: page,
    user: {
      name: user.name || 'there',
      role: user.role,
      department: user.department,
      college: user.college,
    },
    courseContext: courseCode && courseTitle ? { courseCode, title: courseTitle } : null,
    studentIntelligence: studentIntelResult.status === 'fulfilled' ? studentIntelResult.value : null,
    srContext: srResult.status === 'fulfilled' ? srResult.value : null,
    studyPlanSummary: studyPlanResult.status === 'fulfilled' ? studyPlanResult.value : null,
    conversationMemory: memoryResult.status === 'fulfilled' ? memoryResult.value : null,
    toolDetailContext: toolDetailResult.status === 'fulfilled' ? toolDetailResult.value : null,
    fingerprintSummary: fingerprintResult.status === 'fulfilled' ? fingerprintResult.value : null,
  }

  const suggestions = await generatePageSuggestions(user.id, ctx)
  return NextResponse.json({ suggestions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// ─── Context fetchers (lightweight versions of concierge route) ──

async function getStudentIntelligence(userId: string): Promise<StudentIntelligence | null> {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [lowestProgress, enrollments, lastSession] = await Promise.all([
    prisma.studentObjectiveProgress.findFirst({
      where: { studentId: userId, masteryLevel: 'struggling' },
      include: { objective: { select: { title: true } } },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => null),
    prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true },
    }).catch(() => []),
    prisma.toolSession.findFirst({
      where: { userId },
      select: { startedAt: true, score: true },
      orderBy: { startedAt: 'desc' },
    }).catch(() => null),
  ])

  const enrolledCourseIds = enrollments.map(e => e.courseId)
  const [upcomingAssignments, courses] = enrolledCourseIds.length > 0
    ? await Promise.all([
        prisma.assignment.findMany({
          where: {
            courseId: { in: enrolledCourseIds },
            dueAt: { gte: now, lte: weekFromNow },
            isPublished: true,
          },
          select: { title: true, dueAt: true, courseId: true },
          orderBy: { dueAt: 'asc' },
          take: 3,
        }).catch(() => []),
        prisma.course.findMany({
          where: { id: { in: enrolledCourseIds } },
          select: { id: true, courseCode: true },
        }).catch(() => []),
      ])
    : [[], []]

  const courseCodeMap = new Map(courses.map(c => [c.id, c.courseCode]))

  return {
    lowestObjectiveTitle: (lowestProgress as { objective?: { title: string } } | null)?.objective?.title ?? null,
    lastSessionScore: lastSession?.score ?? null,
    daysSinceLastSession: lastSession?.startedAt
      ? Math.floor((Date.now() - new Date(lastSession.startedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null,
    upcomingDueDates: upcomingAssignments
      .filter(a => a.dueAt != null)
      .map(a => ({ title: a.title, dueAt: a.dueAt as Date, courseCode: courseCodeMap.get(a.courseId) ?? '' })),
  }
}

async function getSRContext(userId: string): Promise<SRContext | null> {
  try {
    const { getDueConcepts } = await import('../../../lib/sr-scheduler')
    const dueConcepts = await getDueConcepts(userId)
    if (dueConcepts.length === 0) return null

    const top = dueConcepts[0]
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { lastSRNudgeAt: true },
    })

    return {
      dueCount: dueConcepts.length,
      topDueConcept: top.conceptSlug,
      topDueBloomLevel: top.bloomHighWater,
      hasRemediationHint: top.remediationHints.length > 0,
      daysSinceLastNudge: profile?.lastSRNudgeAt != null
        ? differenceInDays(new Date(), profile.lastSRNudgeAt)
        : null,
    }
  } catch {
    return null
  }
}

async function getStudyPlanSummary(userId: string): Promise<StudyPlanSummary | null> {
  try {
    const log = await prisma.studyPlanLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { courseCode: true } } },
    })
    if (!log) return null
    return {
      courseCode: log.course?.courseCode ?? 'Unknown',
      criticalCount: log.stepsCount,
      highCount: 0,
      topConcept: log.conceptsTargeted[0] ?? null,
      totalMinutes: log.stepsCount * 15,
      generatedAt: log.createdAt.toISOString(),
    }
  } catch {
    return null
  }
}

async function getConversationMemory(userId: string): Promise<ConversationMemoryItem[]> {
  try {
    const notes = await prisma.studentNote.findMany({
      where: { userId, source: 'sandy' },
      select: {
        title: true,
        content: true,
        createdAt: true,
        course: { select: { courseCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    return notes.map(n => ({
      title: n.title,
      content: n.content.slice(0, 200),
      courseCode: n.course?.courseCode ?? null,
      createdAt: n.createdAt,
    }))
  } catch {
    return []
  }
}

async function getToolDetail(page: string): Promise<ToolDetailContext | null> {
  try {
    const toolId = page.split('/')[2]
    if (!toolId) return null
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        name: true,
        shortDescription: true,
        category: true,
        toolType: true,
        creator: { select: { name: true } },
        courseLinks: {
          select: { course: { select: { courseCode: true, title: true } } },
          take: 5,
        },
      },
    })
    if (!tool) return null
    return {
      name: tool.name,
      shortDescription: tool.shortDescription,
      category: tool.category,
      toolType: tool.toolType,
      creatorName: tool.creator.name || 'Unknown',
      courseLinks: tool.courseLinks.map(cl => `${cl.course.courseCode}: ${cl.course.title}`),
    }
  } catch {
    return null
  }
}

async function getFingerprintSummary(userId: string): Promise<string | null> {
  try {
    const fp = await prisma.engagementFingerprint.findUnique({
      where: { userId },
      select: { chronotype: true, peakHours: true, preferredModality: true, socialOrientation: true },
    })
    if (!fp) return null
    const parts: string[] = []
    if (fp.chronotype) parts.push(fp.chronotype)
    if (fp.preferredModality) parts.push(`${fp.preferredModality} learner`)
    if (fp.socialOrientation) parts.push(fp.socialOrientation)
    return parts.length > 0 ? parts.join(', ') : null
  } catch {
    return null
  }
}
