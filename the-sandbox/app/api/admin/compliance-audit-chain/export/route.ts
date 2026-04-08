import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { exportAuditChain } from '../../../../lib/compliance-audit-chain-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(request.url)
  const format = (url.searchParams.get('format') === 'csv' ? 'csv' : 'json') as 'json' | 'csv'

    const data = await exportAuditChain(format)
    const contentType = format === 'csv' ? 'text/csv' : 'application/json'
    const filename = format === 'csv' ? 'audit-chain.csv' : 'audit-chain.json'

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

})
