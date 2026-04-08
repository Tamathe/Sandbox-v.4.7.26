import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { generateComparison } from '../../../lib/compliance-comparison-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const url = new URL(request.url)
    const start1 = url.searchParams.get('start1')
    const end1 = url.searchParams.get('end1')
    const start2 = url.searchParams.get('start2')
    const end2 = url.searchParams.get('end2')

    if (!start1 || !end1 || !start2 || !end2) {
      return NextResponse.json(
        { error: 'Missing required query params: start1, end1, start2, end2 (ISO date strings)' },
        { status: 400 },
      )
    }

    const dates = [start1, end1, start2, end2].map((d) => new Date(d))
    if (dates.some((d) => isNaN(d.getTime()))) {
      return NextResponse.json({ error: 'Invalid date format. Use ISO date strings.' }, { status: 400 })
    }

    const result = await generateComparison(dates[0], dates[1], dates[2], dates[3])
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
