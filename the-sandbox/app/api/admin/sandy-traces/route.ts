import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  SANDY_EXECUTION_STATUSES,
  listSandyExecutionTraces,
} from '../../../lib/agent/execution-traces'
import { isAuthFailure, requireAdminUser } from '../../../lib/server-auth'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const statusParam = searchParams.get('status')
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

  if (limitParam && Number.isNaN(limit)) {
    return NextResponse.json(
      { error: 'limit must be a number' },
      { status: 400 },
    )
  }

  if (
    statusParam &&
    !SANDY_EXECUTION_STATUSES.includes(
      statusParam as (typeof SANDY_EXECUTION_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error: `status must be one of: ${SANDY_EXECUTION_STATUSES.join(', ')}`,
      },
      { status: 400 },
    )
  }

  
    const traces = await listSandyExecutionTraces({
      limit,
      status: statusParam
        ? (statusParam as (typeof SANDY_EXECUTION_STATUSES)[number])
        : undefined,
    })

    return NextResponse.json({ traces }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  

})
