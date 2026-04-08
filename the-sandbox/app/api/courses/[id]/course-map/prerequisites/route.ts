import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { addPrerequisite, removePrerequisite, getPrerequisites } from '../../../../../lib/course-map-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const graph = await getPrerequisites(courseId)
  return NextResponse.json({ graph }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

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
    weekId?: string
    prerequisiteWeekId?: string
    action?: string
  }

  if (!body.weekId || !body.prerequisiteWeekId) {
    return NextResponse.json({ error: 'weekId and prerequisiteWeekId are required' }, { status: 400 })
  }

  if (body.action !== 'add' && body.action !== 'remove') {
    return NextResponse.json({ error: 'action must be "add" or "remove"' }, { status: 400 })
  }

  if (body.action === 'add') {
    await addPrerequisite(body.weekId, body.prerequisiteWeekId)
  } else {
    await removePrerequisite(body.weekId, body.prerequisiteWeekId)
  }

  // Return updated graph
  const graph = await getPrerequisites(courseId)
  return NextResponse.json({ graph }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
