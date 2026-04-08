import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { tagObjectivesBloom } from '../../../../../lib/course-map-service'
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
    weeks: { weekNumber: number; objectives: { title: string }[] }[]
  }

  if (!body.weeks || !Array.isArray(body.weeks)) {
    return NextResponse.json({ error: 'weeks array required' }, { status: 400 })
  }

  const result = await tagObjectivesBloom(courseId, body.weeks)
  return NextResponse.json(result)
})
