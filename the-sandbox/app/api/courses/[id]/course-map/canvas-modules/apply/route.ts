import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { pushModulesToCanvas } from '../../../../../../lib/syllabus-architect/canvas-sync-service'
import type { CanvasModuleProposal } from '../../../../../../lib/syllabus-architect/canvas-sync-service'
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
  const body = parsed.data as { canvasCourseId?: string; modules?: CanvasModuleProposal[] }
  if (!body.canvasCourseId || !body.modules || !Array.isArray(body.modules)) {
    return NextResponse.json({ error: 'Missing canvasCourseId or modules' }, { status: 400 })
  }

  const result = await pushModulesToCanvas(body.canvasCourseId, body.modules)
  return NextResponse.json(result)
})
