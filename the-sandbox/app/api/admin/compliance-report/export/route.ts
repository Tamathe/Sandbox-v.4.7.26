import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { generateComplianceReport } from '../../../../lib/compliance-report-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const html = await generateComplianceReport()

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="compliance-report.html"',
      },
    })

})
