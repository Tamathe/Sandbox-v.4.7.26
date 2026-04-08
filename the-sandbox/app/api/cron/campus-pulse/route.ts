import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { runPulseScan } from '../../../lib/campus-pulse/campus-pulse-service'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await runPulseScan()

  return NextResponse.json(result)
})
