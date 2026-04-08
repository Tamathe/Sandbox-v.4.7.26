/**
 * GET /api/analytics/faculty/interventions?courseId=<id>&studentId=<id>
 *
 * Returns a Haiku-generated intervention recommendation for a specific student
 * in a course, or null if no intervention is warranted.
 *
 * Auth: EDUCATOR or ADMIN only.
 * Logic delegated to app/lib/intervention-service.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { generateIntervention } from '../../../../lib/intervention-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  const studentId = req.nextUrl.searchParams.get('studentId')

  if (!courseId || !studentId) {
    return NextResponse.json(
      { error: 'courseId and studentId are required' },
      { status: 400 },
    )
  }

  const intervention = await generateIntervention(studentId, courseId, auth.user.email)
  return NextResponse.json({ intervention }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
