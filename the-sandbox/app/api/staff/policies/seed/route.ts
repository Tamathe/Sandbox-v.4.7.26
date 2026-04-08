import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { seedPolicyDocuments } from '../../../../lib/staff/policy-seed-data'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const result = await seedPolicyDocuments()

  return NextResponse.json(result)
})
