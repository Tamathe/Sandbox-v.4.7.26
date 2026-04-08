import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { verifyCronSecret } from '../../../lib/server-auth'
import { computeAllForecasts } from '../../../lib/enrollment-forecast/forecast-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronError = verifyCronSecret(req)
  if (cronError) return cronError

  const targetTerm = req.nextUrl.searchParams.get('term') ?? 'Fall 2026'

  const count = await computeAllForecasts(targetTerm)

  return NextResponse.json({
    success: true,
    term: targetTerm,
    coursesForecasted: count,
    computedAt: new Date().toISOString(),
  })
})
