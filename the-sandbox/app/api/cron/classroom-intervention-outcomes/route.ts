import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { measureInterventionOutcomes } from '../../../lib/classroom-intelligence/intervention-tracker'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const denied = verifyCronSecret(req)
  if (denied) return denied

  const results = await measureInterventionOutcomes()

  return NextResponse.json(results)
})
