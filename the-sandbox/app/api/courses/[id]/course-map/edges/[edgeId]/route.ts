/**
 * DELETE /api/courses/[id]/course-map/edges/[edgeId]
 *
 * Deletes a MapEdge from the course map.
 * Verifies the edge belongs to the correct course's map.
 *
 * Auth: requireCourseOwner (educator who owns the course, or admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../lib/server-auth'
import { prisma } from '../../../../../../lib/prisma'
import { notifyCourseMapChange } from '../../../../../../lib/syllabus-architect/notification-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; edgeId: string }> },
) => {
  const { id: courseId, edgeId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  try {
    // Verify edge exists and belongs to this course's map
    const edge = await prisma.mapEdge.findUnique({
      where: { id: edgeId },
      include: { courseMap: { select: { courseId: true } } },
    })

    if (!edge || edge.courseMap.courseId !== courseId) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 })
    }

    await prisma.mapEdge.delete({ where: { id: edgeId } })

    // Fire-and-forget notification
    notifyCourseMapChange(courseId, user.id, 'edge_removed')

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE course-map/edges] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete edge'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
