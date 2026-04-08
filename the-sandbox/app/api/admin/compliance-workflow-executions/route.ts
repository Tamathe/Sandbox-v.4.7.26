import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { getWorkflowExecutionHistory } from '../../../lib/compliance-rules-engine'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const ruleId = request.nextUrl.searchParams.get('ruleId') ?? undefined
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? '20'), 100)

    const executions = await getWorkflowExecutionHistory(ruleId, limit)
    return NextResponse.json({ executions }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
