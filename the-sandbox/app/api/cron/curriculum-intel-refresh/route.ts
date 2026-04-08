import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { runFullRefresh } from '../../../lib/curriculum-intel/curriculum-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const denied = verifyCronSecret(req)
  if (denied) return denied

  const results = await runFullRefresh()

  return NextResponse.json(results)
})
