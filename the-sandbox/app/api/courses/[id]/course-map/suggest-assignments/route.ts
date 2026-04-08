import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { suggestWeekAssignments } from '../../../../../lib/course-map-service'
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
  const { weekNumber } = parsed.data as { weekNumber?: number }
  if (typeof weekNumber !== 'number') {
    return NextResponse.json({ error: 'weekNumber is required' }, { status: 400 })
  }

  const result = await suggestWeekAssignments(courseId, weekNumber)
  return NextResponse.json(result)
})
