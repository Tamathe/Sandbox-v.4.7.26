import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { verifyCronSecret } from '../../../lib/server-auth'
import { discoverBridges } from '../../../lib/concept-bridge/bridge-discovery'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await discoverBridges()
  return NextResponse.json(result)
})
