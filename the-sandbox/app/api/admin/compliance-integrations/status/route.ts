import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { getIntegrationStatus } from '../../../../lib/compliance-integration-monitor-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const integrations = await getIntegrationStatus()
    return NextResponse.json({ integrations }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
