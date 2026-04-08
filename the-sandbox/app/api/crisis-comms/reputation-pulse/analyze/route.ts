import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { analyzeReputationPulse } from '../../../../lib/crisis-comms/reputation-pulse/reputation-pulse-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  let userContext: string | undefined
  const parsed = await parseRequestBody(req)
  if (!('error' in parsed)) {
    userContext = (parsed.data as { userContext?: string }).userContext
  }
  // Body is optional — empty body is fine

  try {
    const result = await analyzeReputationPulse({ userContext })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Reputation pulse analyze error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
})
