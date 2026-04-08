import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { eraseUserData } from '../../../lib/compliance-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const result = await eraseUserData(auth.user)

  return NextResponse.json({
    ok: true,
    message: 'Your account data has been erased. You will be logged out.',
    anonymizedEmail: result.anonymizedEmail,
  })
})
