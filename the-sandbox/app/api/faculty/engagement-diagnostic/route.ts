import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { getEngagementDiagnostic, getSyntheticDiagnostic } from '../../../lib/faculty/engagement-diagnostic-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const diagnostic = await getEngagementDiagnostic(auth.user.id, courseId)

  // Fall back to synthetic data for demo
  if (!diagnostic) {
    const courseCode = req.nextUrl.searchParams.get('courseCode') ?? 'TEK-100'
    return NextResponse.json(getSyntheticDiagnostic(courseCode, courseId))
  }

  return NextResponse.json(diagnostic, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
