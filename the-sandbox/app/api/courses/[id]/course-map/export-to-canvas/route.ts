import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { exportToCanvas } from '../../../../../lib/syllabus-architect/canvas-sync-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * POST /api/courses/[id]/course-map/export-to-canvas
 *
 * Export course map structure to Canvas LMS.
 * Auth: requireCourseOwner.
 * Body: { canvasCourseId: string }
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { canvasCourseId } = parsed.data as { canvasCourseId?: string }

  if (!canvasCourseId || typeof canvasCourseId !== 'string') {
    return NextResponse.json({ error: 'canvasCourseId is required' }, { status: 400 })
  }

  const result = await exportToCanvas(courseId, canvasCourseId)
  return NextResponse.json(result)
})
