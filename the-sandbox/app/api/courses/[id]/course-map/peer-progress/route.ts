import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getClassProgressHeatmap } from '../../../../../lib/syllabus-architect/peer-progress-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/peer-progress — class progress heatmap
 * Educators see full data; students see anonymized percentages only.
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const heatmap = await getClassProgressHeatmap(courseId)

  // Students get anonymized data (percentages only, no counts)
  if (user.role === 'STUDENT') {
    const anonymized = heatmap.map((entry) => ({
      nodeId: entry.nodeId,
      completionRate: entry.completionRate,
      totalStudents: entry.totalStudents,
    }))
    return NextResponse.json({ heatmap: anonymized }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Educators/admins get full data
  return NextResponse.json({ heatmap }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
