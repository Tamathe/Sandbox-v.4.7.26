import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { runClassroomIntelligenceLoop } from '../../../lib/classroom-intelligence/classroom-intelligence-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const denied = verifyCronSecret(req)
  if (denied) return denied

  const results = await runClassroomIntelligenceLoop()

  return NextResponse.json(results)
})
