import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { getFacultyActions } from '../../../../lib/analytics/action-panel-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined

  const actions = await getFacultyActions(user.id, courseId)

  return NextResponse.json({ actions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
