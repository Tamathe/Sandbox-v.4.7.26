import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { listGraphSnapshots, createGraphSnapshot } from '../../../../../lib/syllabus-architect/snapshot-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const snapshots = await listGraphSnapshots(courseId)
  return NextResponse.json({ snapshots }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

/**
 * POST /api/courses/[id]/course-map/snapshots
 * Create a named snapshot of the current graph state.
 * Body: { name: string }
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { name?: string }
  const name = (body.name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Snapshot name is required' }, { status: 400 })
  }

  const snapshot = await createGraphSnapshot(courseId, name, user.id)
  return NextResponse.json({ snapshot }, { status: 201 })
})
