import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { saveReflection, getReflections } from '../../../lib/faculty/day-lifecycle-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined
  const reflections = await getReflections(auth.user.id, courseId)
  return NextResponse.json({ reflections }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { courseId, content, tags, classAttendance, topicsCovered } = parsed.data as { courseId: string; content: string; tags?: string[]; classAttendance?: number; topicsCovered?: string }

  if (!courseId || !content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'courseId and content are required' }, { status: 400 })
  }

  const reflection = await saveReflection(
    auth.user.id,
    courseId,
    content.trim(),
    Array.isArray(tags) ? tags : [],
    classAttendance,
    topicsCovered,
  )

  return NextResponse.json({ reflection }, { status: 201 })
})
