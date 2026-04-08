import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { applyNaturalLanguageChanges } from '../../../../../../lib/syllabus-architect/ai-map-service'
import type { NLChange } from '../../../../../../lib/syllabus-architect/ai-map-service'
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
  const body = parsed.data as { changes?: NLChange[] }
  if (!body.changes || !Array.isArray(body.changes) || body.changes.length === 0) {
    return NextResponse.json({ error: 'Missing changes in request body' }, { status: 400 })
  }

  const result = await applyNaturalLanguageChanges(courseId, auth.user.id, body.changes)
  if (!result.success) {
    return NextResponse.json({ error: result.error, appliedCount: result.appliedCount }, { status: 400 })
  }

  return NextResponse.json({ success: true, appliedCount: result.appliedCount })
})
