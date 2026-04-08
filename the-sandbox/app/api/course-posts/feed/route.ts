import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getStudentCourseFeed } from '../../../lib/course-post-service'

// GET — student course post feed (all enrolled courses, audience-filtered)
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10)
  const result = await getStudentCourseFeed(auth.user.id, limit)

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
