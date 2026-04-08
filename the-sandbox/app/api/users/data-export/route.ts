import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { exportUserData } from '../../../lib/compliance-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const data = await exportUserData(auth.user.id)

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="uky-data-export-${Date.now()}.json"`,
    },
  })
})
