import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { compareCourseMap, compareWithSnapshot } from '../../../../../lib/course-map-service'
import { compareCourseMapStructures } from '../../../../../lib/syllabus-architect/comparison-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/compare
 *
 * Compare course maps. Supports three modes:
 *   ?targetCourseId=<id>  — structural comparison of two courses (Task 66)
 *   ?compareTo=<id>       — legacy week-based comparison
 *   ?snapshotId=<id>      — compare current map with a snapshot
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const { searchParams } = new URL(req.url)
  const targetCourseId = searchParams.get('targetCourseId')
  const compareTo = searchParams.get('compareTo')
  const snapshotId = searchParams.get('snapshotId')

  // Structural comparison (Task 66)
  if (targetCourseId) {
    const auth = await requireEducatorUser(req)
    if (isAuthFailure(auth)) return auth.response

    const comparison = await compareCourseMapStructures(courseId, targetCourseId)
    return NextResponse.json({ comparison }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Legacy: snapshot comparison
  if (snapshotId) {
    const auth = await requireCourseOwner(req, courseId)
    if (isAuthFailure(auth)) return auth.response

    const comparison = await compareWithSnapshot(courseId, snapshotId)
    return NextResponse.json({ comparison }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Legacy: week-based comparison
  if (!compareTo) {
    return NextResponse.json({ error: 'targetCourseId, compareTo, or snapshotId query param required' }, { status: 400 })
  }

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const comparison = await compareCourseMap(courseId, compareTo)
  return NextResponse.json({ comparison }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
