import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { computeComplianceScore } from '../../../lib/compliance-scoring-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const result = await computeComplianceScore(auth.user.id)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
