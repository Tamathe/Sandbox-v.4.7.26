import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { generateDeepLinks } from '../../../../../lib/syllabus-architect/lms-link-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/lms-links
 *
 * Returns all LMS deep links for the course map nodes.
 * Auth: requireCourseOwner (educators + admin only).
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const result = await generateDeepLinks(courseId)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
