import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../../lib/server-auth'
import { restoreGraphSnapshot } from '../../../../../../../lib/syllabus-architect/snapshot-service'
import { notifyCourseMapChange } from '../../../../../../../lib/syllabus-architect/notification-service'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) => {
  const { id: courseId, snapshotId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const result = await restoreGraphSnapshot(courseId, snapshotId)

  // Fire-and-forget notification
  notifyCourseMapChange(courseId, user.id, 'snapshot_restored')

  return NextResponse.json({ result })
})
