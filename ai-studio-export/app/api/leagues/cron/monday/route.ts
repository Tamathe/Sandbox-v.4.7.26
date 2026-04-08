import { NextRequest, NextResponse } from 'next/server'

import { runLeagueMondayDigestJob } from '../../../../lib/leagues/digest'
import { verifyCronSecret } from '../../../../lib/server-auth'

export async function POST(request: NextRequest) {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  try {
    const result = await runLeagueMondayDigestJob()
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/leagues/cron/monday error:', error)
    return NextResponse.json({ error: 'Failed to run league digest job' }, { status: 500 })
  }
}
