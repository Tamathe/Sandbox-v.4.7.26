import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { suggestWeekMaterials } from '../../../../../lib/course-map-service'
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
  const body = parsed.data as { weekNumber?: unknown }
  const weekNumber = typeof body.weekNumber === 'number' && Number.isInteger(body.weekNumber)
    ? body.weekNumber
    : null

  if (weekNumber === null || weekNumber < 1) {
    return NextResponse.json({ error: 'weekNumber must be a positive integer' }, { status: 400 })
  }

  const result = await suggestWeekMaterials(courseId, weekNumber)
  return NextResponse.json(result)
})
