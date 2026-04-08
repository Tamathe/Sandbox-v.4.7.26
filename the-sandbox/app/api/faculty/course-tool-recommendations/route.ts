import { NextRequest, NextResponse } from 'next/server'

import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { getCourseToolRecommendations } from '../../../lib/course-tool-recommendations'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const recommendations = await getCourseToolRecommendations(auth.user.id)

  return NextResponse.json(recommendations, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
