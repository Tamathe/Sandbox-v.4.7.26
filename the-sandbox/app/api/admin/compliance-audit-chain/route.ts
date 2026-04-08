import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { getAuditChain } from '../../../lib/compliance-audit-chain-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parseDate = (str: string | null): Date | undefined => {
    if (!str) return undefined
    const d = new Date(str)
    if (isNaN(d.getTime())) return undefined
    return d
  }

  const url = new URL(request.url)
  const eventType = url.searchParams.get('eventType') || undefined
  const startDate = parseDate(url.searchParams.get('startDate'))
  const endDate = parseDate(url.searchParams.get('endDate'))
  const limit = url.searchParams.get('limit')
    ? parseInt(url.searchParams.get('limit')!, 10)
    : undefined

  
    const entries = await getAuditChain({ eventType, startDate, endDate, limit })
    return NextResponse.json({ entries }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  

})
