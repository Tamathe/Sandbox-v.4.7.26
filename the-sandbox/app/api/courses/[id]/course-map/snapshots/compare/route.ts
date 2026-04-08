import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../lib/server-auth'
import { compareSnapshots } from '../../../../../../lib/syllabus-architect/snapshot-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: courseId } = await params
    const auth = await requireCourseOwner(req, courseId)
    if (isAuthFailure(auth)) return auth.response

    const url = new URL(req.url)
    const a = url.searchParams.get('a')
    const b = url.searchParams.get('b')

    if (!a || !b) {
      return NextResponse.json({ error: 'Both "a" and "b" snapshot IDs are required' }, { status: 400 })
    }

    const result = await compareSnapshots(a, b)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('GET /api/courses/[id]/course-map/snapshots/compare error:', error)
    const message = error instanceof Error ? error.message : 'Failed to compare snapshots'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
