import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { bootstrapComplianceSystem } from '../../../lib/compliance-bootstrap-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const result = await bootstrapComplianceSystem()
    return NextResponse.json(result)

})
