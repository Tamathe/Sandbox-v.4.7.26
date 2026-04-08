import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { getCourseMapNotes, upsertCourseMapNote } from '../../../../../lib/course-map-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const notes = await getCourseMapNotes(courseId, auth.user.id)
  return NextResponse.json({ notes }, {
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
  const body = parsed.data as { weekNumber?: number; text?: string }

  if (typeof body.weekNumber !== 'number') {
    return NextResponse.json({ error: 'weekNumber is required' }, { status: 400 })
  }

  await upsertCourseMapNote(courseId, body.weekNumber, auth.user.id, body.text ?? '')
  const notes = await getCourseMapNotes(courseId, auth.user.id)
  return NextResponse.json({ notes }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
