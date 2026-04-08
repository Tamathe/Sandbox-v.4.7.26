import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireAdminUser } from '../../../lib/server-auth'
import { getCitationStats } from '../../../lib/uknow-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') ?? '30', 10)

    const stats = await getCitationStats(days)
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
