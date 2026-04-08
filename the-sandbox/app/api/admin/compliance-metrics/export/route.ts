import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { exportMetricsCSV } from '../../../../lib/compliance-metrics-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const csv = await exportMetricsCSV()
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="compliance-metrics.csv"',
      },
    })

})
