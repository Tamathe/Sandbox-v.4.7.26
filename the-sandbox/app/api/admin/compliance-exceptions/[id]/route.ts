import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { revokeException } from '../../../../lib/compliance-exception-service'

export const PATCH = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const body = await parseRequestBody<{ revokedReason?: string }>(request)
  if ('error' in body) return body.error

    const exception = await revokeException(id, body.data.revokedReason)
    return NextResponse.json({ exception })

})
