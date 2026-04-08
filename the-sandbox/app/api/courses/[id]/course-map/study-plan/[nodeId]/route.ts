import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { removePlanEntry } from '../../../../../../lib/syllabus-architect/study-planner-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

/**
 * DELETE /api/courses/[id]/course-map/study-plan/[nodeId] — remove a plan entry
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) => {
  const { id: courseId, nodeId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Students only' }, { status: 403 })
  }

  const deleted = await removePlanEntry(user.id, courseId, nodeId)
  if (!deleted) {
    return NextResponse.json({ error: 'Plan entry not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
})
