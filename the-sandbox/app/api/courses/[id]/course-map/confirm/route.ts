import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { confirmCourseMap } from '../../../../../lib/course-map-service'
import type { CourseMapWeek } from '../../../../../lib/course-map-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { weeks?: unknown; expectedVersion?: unknown }

  if (!Array.isArray(body.weeks)) {
    return NextResponse.json({ error: 'weeks must be an array' }, { status: 400 })
  }

  const expectedVersion = typeof body.expectedVersion === 'number' ? body.expectedVersion : undefined
  const userId = 'user' in auth ? auth.user.id : undefined

  const result = await confirmCourseMap(courseId, body.weeks as CourseMapWeek[], {
    expectedVersion,
    userId,
  })
  return NextResponse.json({ result })
})
