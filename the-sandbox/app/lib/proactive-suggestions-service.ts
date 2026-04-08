import { prisma } from './prisma'

export interface ProactiveSuggestion {
  id: string
  category: 'course-health' | 'student-risk' | 'campus-news' | 'tool-usage' | 'deadline'
  priority: 'high' | 'medium' | 'low'
  title: string
  body: string
  actionLabel?: string
  actionUrl?: string
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

// ── Generator: at-risk students ──────────────────────────────────

async function atRiskStudents(userId: string): Promise<ProactiveSuggestion[]> {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: {
      id: true,
      title: true,
      courseCode: true,
      enrollments: {
        select: {
          student: {
            select: { studentProfile: { select: { riskScore: true } } },
          },
        },
      },
    },
  })

  const suggestions: ProactiveSuggestion[] = []
  for (const c of courses) {
    const atRisk = c.enrollments.filter(
      e => e.student.studentProfile?.riskScore != null && e.student.studentProfile.riskScore >= 0.6,
    ).length
    if (atRisk > 0) {
      suggestions.push({
        id: `student-risk:${c.id}`,
        category: 'student-risk',
        priority: 'high',
        title: `${atRisk} student${atRisk > 1 ? 's' : ''} at risk in ${c.courseCode}`,
        body: `${atRisk} enrolled student${atRisk > 1 ? 's have' : ' has'} a risk score above the intervention threshold in ${c.title}.`,
        actionLabel: 'View Dashboard',
        actionUrl: '/',
      })
    }
  }
  return suggestions
}

// ── Generator: low engagement ────────────────────────────────────

async function lowEngagement(userId: string): Promise<ProactiveSuggestion[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: { id: true, title: true, courseCode: true, enrollments: { select: { studentId: true } } },
  })

  if (courses.length === 0) return []

  const courseIds = courses.map(c => c.id)

  const activeCounts = await prisma.toolSession.findMany({
    where: { courseId: { in: courseIds }, startedAt: { gte: sevenDaysAgo }, userId: { not: null } },
    select: { courseId: true, userId: true },
    distinct: ['courseId', 'userId'],
  })

  const activeMap = new Map<string, number>()
  for (const row of activeCounts) {
    if (row.courseId) {
      activeMap.set(row.courseId, (activeMap.get(row.courseId) ?? 0) + 1)
    }
  }

  const suggestions: ProactiveSuggestion[] = []
  for (const c of courses) {
    const total = c.enrollments.length
    if (total === 0) continue
    const active = activeMap.get(c.id) ?? 0
    const engagement = Math.round((active / total) * 100)
    if (engagement < 60) {
      suggestions.push({
        id: `course-health:engagement:${c.id}`,
        category: 'course-health',
        priority: 'medium',
        title: `Low engagement in ${c.courseCode} (${engagement}%)`,
        body: `Only ${active} of ${total} students were active in ${c.title} over the past 7 days.`,
        actionLabel: 'View Dashboard',
        actionUrl: '/',
      })
    }
  }
  return suggestions
}

// ── Generator: upcoming deadlines ────────────────────────────────

async function upcomingDeadlines(userId: string): Promise<ProactiveSuggestion[]> {
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const assignments = await prisma.assignment.findMany({
    where: {
      course: { instructorId: userId },
      dueAt: { gte: now, lte: threeDaysFromNow },
    },
    orderBy: { dueAt: 'asc' },
    take: 5,
    select: {
      id: true,
      title: true,
      dueAt: true,
      course: { select: { title: true, courseCode: true } },
    },
  })

  return assignments.map(a => {
    const hoursLeft = Math.round((a.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60))
    return {
      id: `deadline:${a.id}`,
      category: 'deadline' as const,
      priority: 'high' as const,
      title: `"${a.title}" due in ${hoursLeft}h`,
      body: `Assignment in ${a.course.courseCode} — ${a.course.title} is due within 3 days.`,
      actionLabel: 'View Dashboard',
      actionUrl: '/',
    }
  })
}

// ── Generator: campus news ───────────────────────────────────────

async function campusNews(): Promise<ProactiveSuggestion[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const count = await prisma.uKNowArticle.count({
    where: { publishedAt: { gte: todayStart } },
  })

  if (count === 0) return []

  return [
    {
      id: `campus-news:today:${todayStart.toISOString().slice(0, 10)}`,
      category: 'campus-news',
      priority: 'low',
      title: `${count} new campus article${count > 1 ? 's' : ''} today`,
      body: `UKNow published ${count} article${count > 1 ? 's' : ''} today. Stay current on campus developments.`,
      actionLabel: 'Read articles',
      actionUrl: '/hub?tab=campus',
    },
  ]
}

// ── Generator: underused tools ───────────────────────────────────

async function underusedTools(userId: string): Promise<ProactiveSuggestion[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Get tools linked to educator's courses
  const courseLinks = await prisma.courseToolLink.findMany({
    where: { course: { instructorId: userId } },
    select: {
      toolId: true,
      tool: { select: { name: true } },
      course: { select: { courseCode: true } },
    },
  })

  if (courseLinks.length === 0) return []

  const toolIds = [...new Set(courseLinks.map(l => l.toolId))]

  const sessionCounts = await prisma.toolSession.groupBy({
    by: ['toolId'],
    where: { toolId: { in: toolIds }, startedAt: { gte: thirtyDaysAgo } },
    _count: { id: true },
  })

  const countMap = new Map(sessionCounts.map(s => [s.toolId, s._count.id]))

  // Build a name map from courseLinks
  const toolNameMap = new Map(courseLinks.map(l => [l.toolId, l.tool.name]))

  const suggestions: ProactiveSuggestion[] = []
  for (const toolId of toolIds) {
    const sessions = countMap.get(toolId) ?? 0
    if (sessions < 5) {
      const toolName = toolNameMap.get(toolId) ?? 'Unknown tool'
      suggestions.push({
        id: `tool-usage:${toolId}`,
        category: 'tool-usage',
        priority: 'medium',
        title: `"${toolName}" has only ${sessions} session${sessions !== 1 ? 's' : ''}`,
        body: `This tool linked to your courses has had fewer than 5 sessions in the past 30 days. Consider promoting it to students.`,
        actionLabel: 'View tool',
        actionUrl: `/hub/${toolId}`,
      })
    }
  }
  return suggestions
}

// ── New study guides available (student) ─────────────────────────
async function newStudyGuides(userId: string): Promise<ProactiveSuggestion[]> {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true },
    })
    if (enrollments.length === 0) return []

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const debriefs = await prisma.lectureDebrief.findMany({
      where: {
        courseId: { in: enrollments.map((e) => e.courseId) },
        publishedAt: { not: null, gte: threeDaysAgo },
        status: 'complete',
      },
      include: { course: { select: { courseCode: true } } },
      take: 3,
    })

    return debriefs.map((d) => ({
      id: `debrief:${d.id}`,
      category: 'course-health' as const,
      priority: 'medium' as const,
      title: `New study guide: ${d.title ?? d.course.courseCode}`,
      body: 'Your professor posted a lecture debrief with flashcards and practice questions.',
      actionLabel: 'Review Study Guide',
      actionUrl: `/lecture-debrief/${d.id}`,
    }))
  } catch {
    return []
  }
}

// ── Office Hours queue alert (faculty) ───────────────────────────
async function officeHoursQueue(userId: string): Promise<ProactiveSuggestion[]> {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: userId },
      select: { id: true, courseCode: true },
    })
    if (courses.length === 0) return []

    const suggestions: ProactiveSuggestion[] = []
    for (const course of courses) {
      const count = await prisma.officeHoursQuestion.count({
        where: { courseId: course.id, triageResult: { in: ['queued', 'clustered'] }, resolvedAt: null },
      })
      if (count >= 3) {
        suggestions.push({
          id: `oh-queue:${course.id}`,
          category: 'course-health',
          priority: count >= 8 ? 'high' : 'medium',
          title: `${count} unanswered questions in ${course.courseCode}`,
          body: 'Students are waiting for answers in Office Hours.',
          actionLabel: 'Open Queue',
          actionUrl: `/office-hours/faculty?courseId=${course.id}`,
        })
      }
    }
    return suggestions
  } catch {
    return []
  }
}

// ── Portfolio nudge (student) ────────────────────────────────────
async function portfolioNudge(userId: string): Promise<ProactiveSuggestion[]> {
  try {
    const sessionCount = await prisma.toolSession.count({
      where: { userId, score: { gte: 0.7 } },
    })
    const portfolioArtifactCount = await prisma.portfolioArtifact.count({
      where: { portfolio: { userId } },
    })

    if (sessionCount >= 5 && portfolioArtifactCount < 3) {
      return [{
        id: `portfolio-build:${userId}`,
        category: 'tool-usage',
        priority: 'low',
        title: 'Build your competency portfolio',
        body: `You have ${sessionCount} strong sessions. Import your best work into your portfolio.`,
        actionLabel: 'Open Portfolio',
        actionUrl: '/portfolio-mapper',
      }]
    }
    return []
  } catch {
    return []
  }
}

// ── UKNow trending overlap (student + faculty) ──────────────────

async function uknowTrending(userId: string): Promise<ProactiveSuggestion[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true, college: true, role: true },
    })
    if (!user) return []

    // Get user's department/college/enrolled course titles as signals
    const userSignals: string[] = []
    if (user.department) userSignals.push(user.department.toLowerCase())
    if (user.college) userSignals.push(user.college.toLowerCase())

    if (user.role === 'STUDENT') {
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        select: { course: { select: { title: true } } },
        take: 5,
      })
      for (const e of enrollments) userSignals.push(e.course.title.toLowerCase())
    } else {
      const courses = await prisma.course.findMany({
        where: { instructorId: userId },
        select: { title: true },
        take: 5,
      })
      for (const c of courses) userSignals.push(c.title.toLowerCase())
    }

    if (userSignals.length === 0) return []

    // Get trending topics from recent queries
    const { getTrendingTopics } = await import('./uknow-alert-service')
    const trending = await getTrendingTopics(7, 10)

    // Find overlap between user signals and trending topics
    const overlaps = trending.filter((t) =>
      userSignals.some((s) => t.topic.toLowerCase().includes(s) || s.includes(t.topic.toLowerCase()))
    )

    if (overlaps.length === 0) return []

    const topOverlap = overlaps[0]
    return [{
      id: `uknow-trending:${topOverlap.topic}`,
      category: 'campus-news',
      priority: 'medium',
      title: `"${topOverlap.topic}" is trending on campus`,
      body: `This topic overlaps with your ${user.department ? 'department' : 'courses'} and has ${topOverlap.count} recent mentions on UKNow.`,
      actionLabel: 'Explore on UKNow',
      actionUrl: `/uknow?q=${encodeURIComponent(topOverlap.topic)}`,
    }]
  } catch {
    return []
  }
}

// ── Main entry point ─────────────────────────────────────────────

export async function getProactiveSuggestions(userId: string): Promise<ProactiveSuggestion[]> {
  const results = await Promise.all([
    atRiskStudents(userId),
    lowEngagement(userId),
    upcomingDeadlines(userId),
    campusNews(),
    underusedTools(userId),
    newStudyGuides(userId),
    officeHoursQueue(userId),
    portfolioNudge(userId),
    uknowTrending(userId),
  ])

  const all = results.flat()
  all.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
  return all.slice(0, 8)
}
