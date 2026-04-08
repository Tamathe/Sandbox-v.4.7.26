import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getSandyExecutionTraceDetail } from '../../../../lib/agent/execution-traces'
import { isAuthFailure, requireAdminUser } from '../../../../lib/server-auth'

export const GET = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  
    const trace = await getSandyExecutionTraceDetail(id)
    if (!trace) {
      return NextResponse.json(
        { error: 'Sandy execution trace not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ trace }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  

})
