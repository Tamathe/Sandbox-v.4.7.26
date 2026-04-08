import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { runComplianceTests } from '../../../lib/compliance-test-runner'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const results = await runComplianceTests()
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
