import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { generateEmailInsights } from '../../../../lib/assistant/email-insight-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const insights = await generateEmailInsights(auth.user.id)
  return NextResponse.json({ insights }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
