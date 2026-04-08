import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { getAssignmentScorecard } from '../../../../lib/analytics/rubric-breakdown-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const scorecard = await getAssignmentScorecard(courseId)
  return NextResponse.json({ scorecard }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
