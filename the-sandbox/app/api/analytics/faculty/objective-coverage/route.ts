/**
 * GET /api/analytics/faculty/objective-coverage?courseId=<id>
 *
 * For each LearningObjective in the course, computes:
 *   - attemptCount  — distinct students with any StudentObjectiveProgress record
 *   - avgMastery    — mean of (correct / attempts) for students with attempts > 0
 *   - masteredCount — students where correct/attempts >= 0.7
 *   - coverageRate  — attemptCount / totalEnrolled
 *
 * Response:
 *   { objectives: { objectiveId, title, attemptCount, masteredCount, totalEnrolled,
 *                   avgMastery, coverageRate }[] }
 *   ordered by avgMastery asc (null last)
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

  // Fetch objectives and enrollment count in parallel
  const [objectives, enrollmentCount] = await Promise.all([
    prisma.learningObjective.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        progress: {
          select: {
            studentId: true,
            attempts: true,
            correct: true,
          },
        },
      },
    }),
    prisma.courseEnrollment.count({ where: { courseId } }),
  ])

  if (objectives.length === 0) {
    return NextResponse.json({ objectives: [] })
  }

  const totalEnrolled = enrollmentCount

  const result = objectives.map(obj => {
    const allProgress = obj.progress
    const attemptCount = allProgress.filter(p => p.attempts > 0).length
    const withAttempts = allProgress.filter(p => p.attempts > 0)

    const masteredCount = withAttempts.filter(
      p => p.correct / p.attempts >= 0.7
    ).length

    const avgMastery =
      withAttempts.length > 0
        ? Math.round(
            (withAttempts.reduce((s, p) => s + p.correct / p.attempts, 0) /
              withAttempts.length) *
              100
          ) / 100
        : null

    const coverageRate =
      totalEnrolled > 0
        ? Math.round((attemptCount / totalEnrolled) * 100) / 100
        : 0

    return {
      objectiveId: obj.id,
      title: obj.title,
      attemptCount,
      masteredCount,
      totalEnrolled,
      avgMastery,
      coverageRate,
    }
  })

  // Sort: lowest avgMastery first (null sorts last)
  result.sort((a, b) => {
    if (a.avgMastery === null && b.avgMastery === null) return 0
    if (a.avgMastery === null) return 1
    if (b.avgMastery === null) return -1
    return a.avgMastery - b.avgMastery
  })

  return NextResponse.json({ objectives: result }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
