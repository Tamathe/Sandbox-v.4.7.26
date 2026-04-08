import { NextRequest, NextResponse } from 'next/server'

import { withErrorHandling } from '../../../../lib/api-utils'
import { getPolicyBuilderPreflight } from '../../../../lib/faculty/ai-policy-builder'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  const preflight = await getPolicyBuilderPreflight(
    {
      id: auth.user.id,
      role: auth.user.role,
    },
    courseId,
  )

  return NextResponse.json(preflight, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
