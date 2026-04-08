import { prisma } from './prisma'

/**
 * Returns a personalized context string for Sandy to use when chatting with a student.
 * FERPA-safe: only called for STUDENT role, never exposed to EDUCATOR/ADMIN.
 * Returns empty string if no meaningful context is available.
 */
export async function getStudentContextString(
  userId: string,
  courseId?: string
): Promise<string> {
  const [profile, weakestObjective, lastSession, upcomingDue] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId } }),

    prisma.studentObjectiveProgress.findFirst({
      where: {
        studentId: userId,
        masteryLevel: { in: ['struggling', 'not_started'] },
        ...(courseId ? { courseId } : {}),
      },
      include: { objective: { select: { title: true } } },
      orderBy: { updatedAt: 'asc' },
    }),

    prisma.toolSession.findFirst({
      where: { userId, scoredAt: { not: null }, sensitiveSession: false },
      include: { tool: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
    }),

    prisma.assignment.findFirst({
      where: {
        course: { enrollments: { some: { studentId: userId } } },
        dueAt: { gte: new Date(), lte: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      },
      orderBy: { dueAt: 'asc' },
      select: { title: true, dueAt: true },
    }),
  ])

  const parts: string[] = []

  if (profile) {
    if (profile.riskScore != null && profile.riskScore > 0.5) {
      parts.push(`This student is showing signs of struggle (risk score: ${(profile.riskScore * 100).toFixed(0)}%).`)
    }
    if (profile.learningVelocity != null) {
      const trend = profile.learningVelocity > 0.05 ? 'improving' : profile.learningVelocity < -0.05 ? 'declining' : 'stable'
      parts.push(`Learning velocity is ${trend} (${profile.learningVelocity > 0 ? '+' : ''}${(profile.learningVelocity * 100).toFixed(0)}% week-over-week).`)
    }
    if (profile.preferredModality) {
      parts.push(`Preferred learning modality: ${profile.preferredModality}.`)
    }
    if (profile.topConceptsThisWeek.length > 0) {
      parts.push(`Concepts studied this week: ${profile.topConceptsThisWeek.slice(0, 5).join(', ')}.`)
    }
    if (profile.peakEngagementHour != null) {
      const hour = profile.peakEngagementHour
      const label = hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
      parts.push(`Best performance hour: around ${label}.`)
    }
    if (profile.lastSessionAt) {
      const days = Math.floor((Date.now() - profile.lastSessionAt.getTime()) / (1000 * 60 * 60 * 24))
      if (days > 0) parts.push(`Last session: ${days} day${days !== 1 ? 's' : ''} ago.`)
    }
  }

  if (weakestObjective) {
    parts.push(`Current weakest objective: "${weakestObjective.objective.title}".`)
  }

  if (lastSession?.score != null) {
    const pct = Math.round(lastSession.score * 100)
    parts.push(`Last session ("${lastSession.tool.name}"): score ${pct}%.`)
  }

  if (upcomingDue) {
    const hours = Math.round((upcomingDue.dueAt!.getTime() - Date.now()) / (1000 * 60 * 60))
    parts.push(`Urgent deadline: "${upcomingDue.title}" due in ${hours} hours.`)
  }

  if (parts.length === 0) return ''

  return `\n\n[STUDENT CONTEXT — use to personalize responses, do not recite verbatim]\n${parts.join(' ')}`
}
