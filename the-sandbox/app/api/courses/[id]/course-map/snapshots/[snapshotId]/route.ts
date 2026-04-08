import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../lib/server-auth'
import { deleteGraphSnapshot } from '../../../../../../lib/syllabus-architect/snapshot-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

/**
 * DELETE /api/courses/[id]/course-map/snapshots/[snapshotId]
 * Delete a graph snapshot.
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) => {
  const { id: courseId, snapshotId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  await deleteGraphSnapshot(courseId, snapshotId)
  return NextResponse.json({ ok: true })
})
