import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { duplicateMap } from '../../../../../lib/syllabus-architect/template-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * POST /api/courses/[id]/course-map/duplicate
 * Duplicate the current course's map to a target course.
 * Body: { targetCourseId: string, overwrite?: boolean }
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: sourceCourseId } = await params

  // Must own source course
  const sourceAuth = await requireCourseOwner(req, sourceCourseId)
  if (isAuthFailure(sourceAuth)) return sourceAuth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { targetCourseId?: string; overwrite?: boolean }

  if (!body.targetCourseId || typeof body.targetCourseId !== 'string') {
    return NextResponse.json({ error: 'targetCourseId is required' }, { status: 400 })
  }

  // Must also own target course
  const targetAuth = await requireCourseOwner(req, body.targetCourseId)
  if (isAuthFailure(targetAuth)) return targetAuth.response

  const result = await duplicateMap(sourceCourseId, body.targetCourseId, body.overwrite ?? false)
  return NextResponse.json({ result })
})
