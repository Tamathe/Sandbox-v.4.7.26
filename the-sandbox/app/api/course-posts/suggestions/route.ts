import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { getSuggestedNudges } from '../../../lib/course-post-service'

// GET — Sandy-recommended nudge/post suggestions for faculty
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const suggestions = await getSuggestedNudges(auth.user.id)

  return NextResponse.json({ suggestions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
