import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { generateCEFEvents } from '../../../../lib/compliance-integration-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const cef = await generateCEFEvents()
    return new NextResponse(cef, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="compliance-events.cef"',
      },
    })

})
