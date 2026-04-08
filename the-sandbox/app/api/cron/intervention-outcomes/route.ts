import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { evaluateInterventionOutcomes } from '../../../lib/success/alert-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await evaluateInterventionOutcomes()

  return NextResponse.json(result)
})
