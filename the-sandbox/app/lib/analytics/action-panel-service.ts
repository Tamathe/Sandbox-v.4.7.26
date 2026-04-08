/**
 * Action Panel Service — Faculty Course Intelligence (Phase 4)
 *
 * Synthesizes prioritized action items from multiple data sources:
 * submissions needing review, low-scoring assignments, at-risk students,
 * and stale briefings.
 */

import { prisma } from '../prisma'
import { getAssignmentScorecard } from './rubric-breakdown-service'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ActionItem {
  id: string
  type: 'review' | 'low-score' | 'at-risk' | 'stale-briefing'
  priority: 'high' | 'medium' | 'low'
  label: string
  description: string
  courseId?: string
  meta?: Record<string, unknown>
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function getFacultyActions(
  userId: string,
  courseId?: string,
): Promise<ActionItem[]> {
  const courseFilter = courseId
    ? { id: courseId }
    : { instructorId: userId }

  // Get courses this faculty owns (scoped or all)
  const courses = await prisma.course.findMany({
    where: courseFilter,
    select: { id: true, title: true },
  })

  if (courses.length === 0) return []

  const courseIds = courses.map((c) => c.id)
  const courseMap = new Map(courses.map((c) => [c.id, c.title]))

  // Fetch all sources in parallel
  const [unreviewedSubmissions, scorecards, atRiskStudents, staleBriefings] =
    await Promise.all([
      // 1. Submissions needing review
      prisma.submission.findMany({
        where: {
          assignment: { courseId: { in: courseIds } },
          gradebookEntry: {
            status: { in: ['AI_DRAFT', 'PENDING_REVIEW'] },
          },
        },
        select: {
          id: true,
          assignment: {
            select: { id: true, title: true, courseId: true },
          },
          student: { select: { id: true, name: true } },
        },
      }),

      // 2. Scorecard data for low-scoring assignments
      Promise.all(courseIds.map((cid) => getAssignmentScorecard(cid))),

      // 3. At-risk students: no session in 14 days OR avg score < 0.5
      getAtRiskStudents(courseIds),

      // 4. Stale briefings
      prisma.facultyBriefing.findMany({
        where: {
          userId,
          stale: true,
          ...(courseId ? { courseId } : {}),
        },
        select: { id: true, courseId: true, generatedAt: true },
      }),
    ])

  const actions: ActionItem[] = []

  // ── 1. Submission review actions ────────────────────────────────────────────

  // Group by assignment
  const byAssignment = new Map<string, typeof unreviewedSubmissions>()
  for (const sub of unreviewedSubmissions) {
    const key = sub.assignment.id
    if (!byAssignment.has(key)) byAssignment.set(key, [])
    byAssignment.get(key)!.push(sub)
  }

  for (const [assignmentId, subs] of byAssignment) {
    const first = subs[0]
    const count = subs.length
    const cId = first.assignment.courseId
    actions.push({
      id: `review-${assignmentId}`,
      type: 'review',
      priority: count > 5 ? 'high' : count > 2 ? 'medium' : 'low',
      label: `${count} submission${count > 1 ? 's' : ''} awaiting review`,
      description: `"${first.assignment.title}" in ${courseMap.get(cId) ?? 'Unknown Course'} has ${count} unreviewed submission${count > 1 ? 's' : ''}.`,
      courseId: cId,
      meta: {
        assignmentId,
        count,
        studentNames: subs.map((s) => s.student?.name).filter(Boolean),
      },
    })
  }

  // ── 2. Low-scoring assignment actions ───────────────────────────────────────

  for (const scorecard of scorecards) {
    for (const assignment of scorecard) {
      if (
        assignment.avgComposite !== null &&
        assignment.avgComposite < 0.5 &&
        assignment.submissionCount > 0
      ) {
        actions.push({
          id: `low-score-${assignment.assignmentId}`,
          type: 'low-score',
          priority: assignment.avgComposite < 0.3 ? 'high' : 'medium',
          label: `Low scores on "${assignment.title}"`,
          description: `Average composite ${(assignment.avgComposite * 100).toFixed(0)}% across ${assignment.submissionCount} submission${assignment.submissionCount > 1 ? 's' : ''}. Consider reviewing rubric alignment or providing additional support.`,
          courseId: courseIds.find((cid) =>
            scorecards[courseIds.indexOf(cid)]?.some(
              (a) => a.assignmentId === assignment.assignmentId,
            ),
          ),
          meta: {
            assignmentId: assignment.assignmentId,
            avgComposite: assignment.avgComposite,
            submissionCount: assignment.submissionCount,
          },
        })
      }
    }
  }

  // ── 3. At-risk student actions ──────────────────────────────────────────────

  for (const student of atRiskStudents) {
    actions.push({
      id: `at-risk-${student.userId}-${student.courseId}`,
      type: 'at-risk',
      priority: 'high',
      label: `${student.name} may need attention`,
      description: student.reason,
      courseId: student.courseId,
      meta: {
        studentId: student.userId,
        lastSessionAt: student.lastSessionAt,
        avgScore: student.avgScore,
      },
    })
  }

  // ── 4. Stale briefing actions ───────────────────────────────────────────────

  for (const briefing of staleBriefings) {
    actions.push({
      id: `stale-briefing-${briefing.id}`,
      type: 'stale-briefing',
      priority: 'low',
      label: 'Morning briefing is stale',
      description: `Briefing for ${briefing.courseId ? courseMap.get(briefing.courseId) ?? 'a course' : 'all courses'} was generated ${timeAgo(briefing.generatedAt)} and may be outdated.`,
      courseId: briefing.courseId ?? undefined,
      meta: { briefingId: briefing.id, generatedAt: briefing.generatedAt },
    })
  }

  // ── Sort: priority desc, then type weight ───────────────────────────────────

  const priorityWeight = { high: 3, medium: 2, low: 1 }
  actions.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])

  return actions
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface AtRiskStudent {
  userId: string
  name: string
  courseId: string
  reason: string
  lastSessionAt: Date | null
  avgScore: number | null
}

async function getAtRiskStudents(courseIds: string[]): Promise<AtRiskStudent[]> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  // Get all enrolled students for these courses
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId: { in: courseIds } },
    select: {
      courseId: true,
      student: { select: { id: true, name: true } },
    },
  })

  if (enrollments.length === 0) return []

  const studentIds = [...new Set(enrollments.map((e) => e.student.id))] as string[]

  // Get most recent session per student + average scores
  const [recentSessions, avgScores] = await Promise.all([
    prisma.toolSession.groupBy({
      by: ['userId'],
      where: { userId: { in: studentIds } },
      _max: { startedAt: true },
    }),
    prisma.toolSession.groupBy({
      by: ['userId'],
      where: {
        userId: { in: studentIds },
        score: { not: null },
      },
      _avg: { score: true },
    }),
  ])

  const lastSessionMap = new Map(
    recentSessions.map((s) => [s.userId, s._max?.startedAt ?? null]),
  )
  const avgScoreMap = new Map(
    avgScores.map((s) => [s.userId, s._avg?.score ?? null]),
  )

  const results: AtRiskStudent[] = []

  for (const enrollment of enrollments) {
    const { student, courseId } = enrollment
    const lastSession = lastSessionMap.get(student.id)
    const avgScore = avgScoreMap.get(student.id)

    const inactive = !lastSession || lastSession < fourteenDaysAgo
    const lowScore = avgScore !== null && avgScore !== undefined && avgScore < 0.5

    if (inactive || lowScore) {
      const reasons: string[] = []
      if (inactive) {
        reasons.push(
          lastSession
            ? `no activity since ${lastSession.toLocaleDateString()}`
            : 'no recorded sessions',
        )
      }
      if (lowScore) {
        reasons.push(`average score ${((avgScore as number) * 100).toFixed(0)}%`)
      }

      results.push({
        userId: student.id,
        name: student.name ?? 'Unknown Student',
        courseId,
        reason: `${student.name ?? 'Student'} in this course: ${reasons.join(', ')}.`,
        lastSessionAt: lastSession ?? null,
        avgScore: avgScore ?? null,
      })
    }
  }

  return results
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
