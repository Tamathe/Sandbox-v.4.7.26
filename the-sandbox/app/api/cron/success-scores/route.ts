import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { batchComputeScores } from '../../../lib/success/success-service'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await batchComputeScores()

  return NextResponse.json(result)
})
