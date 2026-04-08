/**
 * GET /api/analytics/curriculum-gaps?courseId=<id>
 *
 * For each LearningObjective in the course, computes:
 *   coverageRatio  = students who attempted (correct > 0) / enrolled
 *   avgMastery     = avg(correct/attempts) across students who attempted
 *   notAttemptedCount
 * Auth: EDUCATOR or ADMIN. Ordered by coverageRatio asc (worst gaps first).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const enrolledCount = await prisma.courseEnrollment.count({ where: { courseId } })
  if (enrolledCount === 0) {
    return NextResponse.json({ gaps: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const objectives = await prisma.learningObjective.findMany({
    where: { courseId },
    select: { id: true, title: true },
    orderBy: { orderIndex: 'asc' },
  })

  if (objectives.length === 0) {
    return NextResponse.json({ gaps: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const objectiveIds = objectives.map(o => o.id)

  const progressRecords = await prisma.studentObjectiveProgress.findMany({
    where: { objectiveId: { in: objectiveIds } },
    select: { objectiveId: true, attempts: true, correct: true },
  })

  const progressByObjective = new Map<string, { attempts: number; correct: number }[]>()
  for (const p of progressRecords) {
    const list = progressByObjective.get(p.objectiveId) ?? []
    list.push({ attempts: p.attempts, correct: p.correct })
    progressByObjective.set(p.objectiveId, list)
  }

  const gaps = objectives.map(obj => {
    const records = progressByObjective.get(obj.id) ?? []
    const attempted = records.filter(r => r.attempts > 0)
    const withCorrect = records.filter(r => r.correct > 0)
    const coverageRatio = withCorrect.length / enrolledCount
    const avgMastery =
      attempted.length > 0
        ? attempted.reduce((sum, r) => sum + r.correct / r.attempts, 0) / attempted.length
        : 0
    const notAttemptedCount = Math.max(0, enrolledCount - attempted.length)

    return {
      objectiveId: obj.id,
      title: obj.title,
      coverageRatio,
      avgMastery,
      notAttemptedCount,
      enrolledCount,
    }
  })

  gaps.sort((a, b) => a.coverageRatio - b.coverageRatio)

  return NextResponse.json({ gaps }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
