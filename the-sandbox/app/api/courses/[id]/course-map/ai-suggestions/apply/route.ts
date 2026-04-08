import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { applySuggestion } from '../../../../../../lib/syllabus-architect/ai-map-service'
import type { AISuggestion } from '../../../../../../lib/syllabus-architect/ai-map-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { suggestion?: AISuggestion }
  if (!body.suggestion) {
    return NextResponse.json({ error: 'Missing suggestion in request body' }, { status: 400 })
  }

  const result = await applySuggestion(courseId, auth.user.id, body.suggestion)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
})
