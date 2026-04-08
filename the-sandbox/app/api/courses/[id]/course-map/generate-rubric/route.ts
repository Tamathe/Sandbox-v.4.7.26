import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { generateCourseMapRubric } from '../../../../../lib/course-map-service'
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
  const body = parsed.data as {
    weekNumber: number
    assignmentIndex: number
    weeks: { weekNumber: number; objectives: { title: string }[]; assignments: { title: string; type: string; description: string | null; pointsPossible: number | null }[] }[]
  }

  if (typeof body.weekNumber !== 'number' || typeof body.assignmentIndex !== 'number' || !Array.isArray(body.weeks)) {
    return NextResponse.json({ error: 'weekNumber, assignmentIndex, and weeks array required' }, { status: 400 })
  }

  const result = await generateCourseMapRubric(courseId, body.weekNumber, body.assignmentIndex, body.weeks)
  return NextResponse.json(result)
})
