import { prisma } from './prisma'
import { INACTIVE_DAYS_THRESHOLD, MISSED_ASSIGNMENT_CAP_THRESHOLD } from './student-risk-constants'

export interface CourseSummaryItem {
  courseId: string
  enrollmentCount: number
  ungradedCount: number
  atRiskInactive7d: number
  atRiskMissed2plus: number
  unansweredDiscussions: number
  upcomingDeadlines: Array<{
    assignmentId: string
    title: string
    dueAt: string
  }>
  averageGrade: number | null
}

/**
 * Shared utility: returns the set of studentIds with any submission or tool session
 * since `since` in the given course. Used by summary, insights, and deep analysis.
 */
export async function getActiveStudentIds(
  courseId: string,
  studentIds: string[],
  since: Date
): Promise<Set<string>> {
  const [submitters, sessionUsers] = await Promise.all([
    prisma.submission.findMany({
      where: {
        studentId: { in: studentIds },
        assignment: { courseId },
        submittedAt: { gte: since },
      },
      select: { studentId: true },
      distinct: ['studentId'],
    }),
    prisma.toolSession.findMany({
      where: {
        userId: { in: studentIds },
        courseId,
        startedAt: { gte: since },
      },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  const active = new Set<string>()
  for (const s of submitters) active.add(s.studentId)
  for (const s of sessionUsers) if (s.userId) active.add(s.userId)
  return active
}

/**
 * Shared utility: returns enrolled student IDs for a course.
 */
export async function getEnrolledStudentIds(courseId: string): Promise<string[]> {
  const enrolled = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })
  return enrolled.map((e: { studentId: string }) => e.studentId)
}

/**
 * Shared utility: count of inactive students (no activity in INACTIVE_DAYS_THRESHOLD days).
 */
export async function getInactiveCount(courseId: string): Promise<number> {
  const studentIds = await getEnrolledStudentIds(courseId)
  if (studentIds.length === 0) return 0
  const since = new Date(Date.now() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000)
  const active = await getActiveStudentIds(courseId, studentIds, since)
  return studentIds.length - active.size
}

export async function getCourseSummaries(userId: string): Promise<CourseSummaryItem[]> {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: { id: true },
  })

  if (courses.length === 0) return []

  return Promise.all(
    courses.map((c: { id: string }) => buildCourseSummary(c.id))
  )
}

async function buildCourseSummary(courseId: string): Promise<CourseSummaryItem> {
  const now = new Date()
  const inactiveSince = new Date(now.getTime() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    enrollmentCount,
    ungradedCount,
    upcomingDeadlines,
    avgResult,
    studentIds,
  ] = await Promise.all([
    prisma.courseEnrollment.count({ where: { courseId } }),
    prisma.gradebookEntry.count({
      where: {
        submission: { assignment: { courseId } },
        status: { in: ['AI_DRAFT', 'PENDING_REVIEW'] },
      },
    }),
    prisma.assignment.findMany({
      where: {
        courseId,
        isPublished: true,
        dueAt: { gte: now, lte: sevenDaysFromNow },
      },
      select: { id: true, title: true, dueAt: true },
      orderBy: { dueAt: 'asc' },
    }),
    prisma.gradebookEntry.aggregate({
      where: {
        submission: { assignment: { courseId } },
        status: 'RELEASED',
        facultyScore: { not: null },
      },
      _avg: { facultyScore: true },
    }),
    getEnrolledStudentIds(courseId),
  ])

  let atRiskInactive7d = 0
  let atRiskMissed2plus = 0
  let unansweredDiscussions = 0

  if (studentIds.length > 0) {
    const [activeIds, unansweredCount, missed2Plus] = await Promise.all([
      getActiveStudentIds(courseId, studentIds, inactiveSince),
      getUnansweredDiscussionCount(courseId),
      getMissed2PlusCount(courseId, studentIds, now),
    ])

    atRiskInactive7d = studentIds.length - activeIds.size
    atRiskMissed2plus = missed2Plus
    unansweredDiscussions = unansweredCount
  }

  return {
    courseId,
    enrollmentCount,
    ungradedCount,
    atRiskInactive7d,
    atRiskMissed2plus,
    unansweredDiscussions,
    upcomingDeadlines: upcomingDeadlines.map((d: { id: string; title: string; dueAt: Date | null }) => ({
      assignmentId: d.id,
      title: d.title,
      dueAt: d.dueAt!.toISOString(),
    })),
    averageGrade: avgResult._avg.facultyScore ?? null,
  }
}

async function getMissed2PlusCount(
  courseId: string,
  studentIds: string[],
  now: Date
): Promise<number> {
  const pastDueAssignments = await prisma.assignment.findMany({
    where: { courseId, isPublished: true, dueAt: { lt: now } },
    select: { id: true },
  })

  if (pastDueAssignments.length < MISSED_ASSIGNMENT_CAP_THRESHOLD) return 0

  const pastDueIds = pastDueAssignments.map((a) => a.id)

  // Single batched query instead of per-student N+1
  const allSubmissions = await prisma.submission.findMany({
    where: { studentId: { in: studentIds }, assignmentId: { in: pastDueIds } },
    select: { studentId: true, assignmentId: true },
  })

  const studentSubmitted = new Map<string, Set<string>>()
  for (const s of allSubmissions) {
    const set = studentSubmitted.get(s.studentId) ?? new Set()
    set.add(s.assignmentId)
    studentSubmitted.set(s.studentId, set)
  }

  let count = 0
  for (const studentId of studentIds) {
    const submitted = studentSubmitted.get(studentId)?.size ?? 0
    if (pastDueIds.length - submitted >= MISSED_ASSIGNMENT_CAP_THRESHOLD) count++
  }

  return count
}

async function getUnansweredDiscussionCount(courseId: string): Promise<number> {
  const threads = await prisma.discussionThread.findMany({
    where: { courseId },
    select: {
      id: true,
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { author: { select: { role: true } } },
      },
    },
  })

  return threads.filter((t) => {
    const lastPost = t.posts[0]
    return lastPost?.author.role === 'STUDENT'
  }).length
}
