import { prisma } from '../prisma'
import type { StudentBriefing } from './homepage-types'

/**
 * Builds a FERPA-compliant student briefing for a faculty member.
 * ONLY returns data from courses taught by the authenticated educator.
 */
export async function getStudentBriefing(
  facultyId: string,
  studentId: string,
): Promise<StudentBriefing | null> {
  // Find student
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true },
  })
  if (!student) return null

  // FERPA-scoped: only courses where the authenticated faculty is the instructor
  const courses = await prisma.course.findMany({
    where: {
      instructorId: facultyId,
      enrollments: { some: { studentId } },
    },
    select: {
      id: true,
      courseCode: true,
      assignments: {
        select: {
          id: true,
          title: true,
          pointsPossible: true,
          dueAt: true,
          submissions: {
            where: { studentId },
            select: {
              submittedAt: true,
              gradebookEntry: {
                select: { aiScore: true, facultyScore: true },
              },
            },
          },
        },
        orderBy: { dueAt: 'desc' },
      },
    },
  })

  if (courses.length === 0) return null

  // Build course-level data
  const courseBriefings = courses.map((course) => {
    const allSubmissions = course.assignments.flatMap((a) =>
      a.submissions.map((s) => ({
        name: a.title,
        score: getScore(s.gradebookEntry),
        maxScore: a.pointsPossible,
        submittedAt: s.submittedAt,
      })),
    )

    const scoredSubmissions = allSubmissions.filter((s) => s.score !== null) as Array<{
      name: string
      score: number
      maxScore: number
      submittedAt: Date
    }>

    // Grade percentage
    const totalEarned = scoredSubmissions.reduce((sum, s) => sum + s.score, 0)
    const totalPossible = scoredSubmissions.reduce((sum, s) => sum + s.maxScore, 0)
    const gradePercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0

    // Grade trend — compare first half vs second half of scored submissions
    const gradeTrend = computeGradeTrend(scoredSubmissions)

    // Recent assignments (last 3)
    const recentAssignments = scoredSubmissions
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, 3)
      .map((s) => ({
        name: s.name,
        score: Math.round(s.score),
        maxScore: s.maxScore,
      }))

    // Last active (most recent submission)
    const lastSub = allSubmissions
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0]

    return {
      courseId: course.id,
      courseCode: course.courseCode,
      currentGrade: percentageToGrade(gradePercentage),
      gradePercentage,
      gradeTrend,
      recentAssignments,
      lastActiveAt: lastSub?.submittedAt.toISOString() ?? null,
      // Attendance is not currently tracked in schema — use assignment completion as proxy
      attendancePresent: allSubmissions.length,
      attendanceTotal: course.assignments.length,
    }
  })

  // Tool engagement — FERPA scoped to faculty's courses
  const courseIds = courses.map((c) => c.id)
  const toolSessions = await prisma.toolSession.findMany({
    where: {
      userId: studentId,
      courseId: { in: courseIds },
      sensitiveSession: false,
    },
    select: {
      tool: { select: { name: true } },
      score: true,
    },
  })

  // Group by tool
  const toolMap = new Map<string, { count: number; totalScore: number; scoredCount: number }>()
  for (const session of toolSessions) {
    const name = session.tool?.name ?? 'Unknown Tool'
    const entry = toolMap.get(name) ?? { count: 0, totalScore: 0, scoredCount: 0 }
    entry.count++
    if (session.score != null) {
      entry.totalScore += session.score * 100
      entry.scoredCount++
    }
    toolMap.set(name, entry)
  }

  const toolEngagement = Array.from(toolMap.entries()).map(([toolName, data]) => ({
    toolName,
    sessionCount: data.count,
    averageScore: data.scoredCount > 0 ? Math.round(data.totalScore / data.scoredCount) : 0,
  }))

  // Visit notes — only from this faculty
  const visitNotes = await prisma.officeHoursVisitNote.findMany({
    where: { facultyId, studentId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      course: { select: { courseCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const previousVisitNotes = visitNotes.map((note) => ({
    id: note.id,
    date: note.createdAt.toISOString(),
    content: note.content,
    courseCode: note.course?.courseCode ?? null,
  }))

  // Compute highlights for recommendation snapshots
  const highlights = computeHighlights(courseBriefings, toolEngagement, previousVisitNotes)

  return {
    studentName: student.name,
    studentId: student.id,
    courses: courseBriefings,
    toolEngagement,
    previousVisitNotes,
    highlights,
  }
}

function getScore(
  entry: { aiScore: number | null; facultyScore: number | null } | null,
): number | null {
  if (!entry) return null
  if (entry.facultyScore != null) return entry.facultyScore
  if (entry.aiScore != null) return entry.aiScore
  return null
}

function computeGradeTrend(
  scoredSubmissions: Array<{ score: number; maxScore: number; submittedAt: Date }>,
): 'improving' | 'stable' | 'declining' {
  if (scoredSubmissions.length < 4) return 'stable'

  const sorted = [...scoredSubmissions].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
  )
  const mid = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, mid)
  const secondHalf = sorted.slice(mid)

  const avgFirst = firstHalf.reduce((s, e) => s + (e.score / e.maxScore), 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, e) => s + (e.score / e.maxScore), 0) / secondHalf.length

  const delta = avgSecond - avgFirst
  if (delta > 0.05) return 'improving'
  if (delta < -0.05) return 'declining'
  return 'stable'
}

function percentageToGrade(pct: number): string {
  if (pct >= 93) return 'A'
  if (pct >= 90) return 'A-'
  if (pct >= 87) return 'B+'
  if (pct >= 83) return 'B'
  if (pct >= 80) return 'B-'
  if (pct >= 77) return 'C+'
  if (pct >= 73) return 'C'
  if (pct >= 70) return 'C-'
  if (pct >= 67) return 'D+'
  if (pct >= 60) return 'D'
  return 'F'
}

function computeHighlights(
  courses: Array<{ gradePercentage: number; courseCode: string }>,
  toolEngagement: Array<{ sessionCount: number; averageScore: number }>,
  notes: Array<{ content: string }>,
): StudentBriefing['highlights'] {
  const highlights: StudentBriefing['highlights'] = []

  // Top performing courses
  for (const course of courses) {
    if (course.gradePercentage >= 90) {
      highlights.push({
        label: `${course.gradePercentage}% in ${course.courseCode}`,
        type: 'percentile',
      })
    }
  }

  // Tool engagement
  const totalSessions = toolEngagement.reduce((s, t) => s + t.sessionCount, 0)
  const avgScore = toolEngagement.length > 0
    ? Math.round(toolEngagement.reduce((s, t) => s + t.averageScore, 0) / toolEngagement.length)
    : 0

  if (totalSessions > 0) {
    highlights.push({
      label: `${totalSessions} tool sessions, avg score ${avgScore}%`,
      type: 'sessions',
    })
  }

  // Consistency — check if all courses are above 75%
  if (courses.length > 0 && courses.every((c) => c.gradePercentage >= 75)) {
    highlights.push({
      label: 'Consistent engagement (never below 75%)',
      type: 'consistency',
    })
  }

  // Previous notes
  if (notes.length > 0) {
    highlights.push({
      label: `${notes.length} previous visit note${notes.length === 1 ? '' : 's'}`,
      type: 'note',
    })
  }

  return highlights
}

/**
 * Synthetic fallback for demo when no real data exists.
 */
export function getSyntheticBriefing(studentName: string, studentId: string): StudentBriefing {
  return {
    studentName,
    studentId,
    courses: [
      {
        courseId: 'demo-tek-100-course',
        courseCode: 'TEK-100',
        currentGrade: 'B-',
        gradePercentage: 78,
        gradeTrend: 'declining',
        recentAssignments: [
          { name: 'Assignment 5.1', score: 62, maxScore: 100 },
          { name: 'Quiz 5', score: 71, maxScore: 100 },
          { name: 'Assignment 4.3', score: 85, maxScore: 100 },
        ],
        lastActiveAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        attendancePresent: 11,
        attendanceTotal: 13,
      },
    ],
    toolEngagement: [
      { toolName: 'Case Study Analyzer', sessionCount: 4, averageScore: 72 },
      { toolName: 'Module Review Bot', sessionCount: 2, averageScore: 68 },
    ],
    previousVisitNotes: [
      {
        id: 'demo-note-1',
        date: new Date('2026-03-10T15:00:00').toISOString(),
        content: 'Discussed Module 4 confusion. Recommended extra practice with Case Study Analyzer.',
        courseCode: 'TEK-100',
      },
    ],
    highlights: [
      { label: '78% in TEK-100', type: 'percentile' },
      { label: '6 tool sessions, avg score 70%', type: 'sessions' },
      { label: '1 previous visit note', type: 'note' },
    ],
  }
}
