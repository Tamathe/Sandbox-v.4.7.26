import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { buildDeepCourseAnalysis } from '../../../../../lib/course-insights-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const rateLimitResult = await checkRateLimit(req, `course-insight:${courseId}`, 'GENERATE')
  if (rateLimitResult) return rateLimitResult

  const result = await buildDeepCourseAnalysis(courseId)

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
})
