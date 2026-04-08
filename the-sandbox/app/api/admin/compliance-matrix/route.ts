import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { getComplianceMatrix, getGapAnalysis } from '../../../lib/regulatory-mapping-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const [matrix, gaps] = await Promise.all([
      getComplianceMatrix(),
      getGapAnalysis(),
    ])

    return NextResponse.json({ ...matrix, gaps }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
