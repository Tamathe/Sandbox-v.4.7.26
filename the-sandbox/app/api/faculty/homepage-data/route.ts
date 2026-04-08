import { NextRequest, NextResponse } from 'next/server'
import { getFacultyHomepageV2Data } from '../../../lib/faculty/homepage-aggregator'
import { isAuthFailure, requireEducatorUser } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireEducatorUser(req)
    if (isAuthFailure(auth)) return auth.response

    const data = await getFacultyHomepageV2Data(auth.user.id)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
