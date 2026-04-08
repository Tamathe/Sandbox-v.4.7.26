/**
 * GET /api/analytics/faculty/cohort-compare?courseId=<id>
 *
 * Groups enrolled students into terciles by their average ToolSession.score for this course:
 *   top  — avg score >= 0.70
 *   mid  — avg score  0.40–0.69
 *   low  — avg score < 0.40
 *   (students with zero scored sessions → no_data group, excluded from chart, counted separately)
 *
 * Per group computes:
 *   count, avgScore, avgSessionsPerStudent, avgDurationMinutes
 *
 * Returns:
 *   {
 *     cohorts: { label: 'Top'|'Mid'|'Low'; count: number; avgScore: number;
 *                avgSessionsPerStudent: number; avgDurationMinutes: number }[]
 *     noDataCount: number
 *   }
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Fetch all enrolled students for this course
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })

  if (enrollments.length === 0) {
    return NextResponse.json({ cohorts: [], noDataCount: 0 })
  }

  const studentIds = enrollments.map(e => e.studentId)

  // Fetch all sessions for enrolled students in this course (FERPA: exclude sensitiveSession)
  const sessions = await prisma.toolSession.findMany({
    where: {
      courseId,
      userId: { in: studentIds },
      sensitiveSession: false,
    },
    select: {
      userId: true,
      score: true,
      durationSeconds: true,
    },
  })

  // Aggregate per student
  type StudentStats = {
    sessionCount: number
    scoreSum: number
    scoreCount: number
    durationSum: number
    durationCount: number
  }

  const studentMap = new Map<string, StudentStats>()
  for (const id of studentIds) {
    studentMap.set(id, {
      sessionCount: 0,
      scoreSum: 0,
      scoreCount: 0,
      durationSum: 0,
      durationCount: 0,
    })
  }

  for (const s of sessions) {
    if (!s.userId) continue
    const stat = studentMap.get(s.userId)
    if (!stat) continue

    stat.sessionCount++

    if (s.score !== null) {
      stat.scoreSum += s.score
      stat.scoreCount++
    }

    if (s.durationSeconds !== null) {
      stat.durationSum += s.durationSeconds
      stat.durationCount++
    }
  }

  // Classify each student into a cohort
  type Cohort = {
    label: 'Top' | 'Mid' | 'Low'
    students: { avgScore: number; sessionCount: number; avgDurationSeconds: number }[]
  }

  const cohorts: Record<'Top' | 'Mid' | 'Low', Cohort['students']> = {
    Top: [],
    Mid: [],
    Low: [],
  }
  let noDataCount = 0

  for (const stat of studentMap.values()) {
    if (stat.scoreCount === 0) {
      noDataCount++
      continue
    }

    const avgScore = stat.scoreSum / stat.scoreCount
    const avgDurationSeconds = stat.durationCount > 0 ? stat.durationSum / stat.durationCount : 0

    const entry = {
      avgScore,
      sessionCount: stat.sessionCount,
      avgDurationSeconds,
    }

    if (avgScore >= 0.7) {
      cohorts.Top.push(entry)
    } else if (avgScore >= 0.4) {
      cohorts.Mid.push(entry)
    } else {
      cohorts.Low.push(entry)
    }
  }

  const buildCohortResult = (label: 'Top' | 'Mid' | 'Low') => {
    const students = cohorts[label]
    const count = students.length
    if (count === 0) return { label, count, avgScore: 0, avgSessionsPerStudent: 0, avgDurationMinutes: 0 }

    const avgScore = Math.round((students.reduce((s, x) => s + x.avgScore, 0) / count) * 100) / 100
    const avgSessionsPerStudent =
      Math.round((students.reduce((s, x) => s + x.sessionCount, 0) / count) * 10) / 10
    const avgDurationMinutes =
      Math.round((students.reduce((s, x) => s + x.avgDurationSeconds, 0) / count / 60) * 10) / 10

    return { label, count, avgScore, avgSessionsPerStudent, avgDurationMinutes }
  }

  const result = (['Top', 'Mid', 'Low'] as const)
    .map(buildCohortResult)
    .filter(c => c.count > 0)

  return NextResponse.json({ cohorts: result, noDataCount }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
