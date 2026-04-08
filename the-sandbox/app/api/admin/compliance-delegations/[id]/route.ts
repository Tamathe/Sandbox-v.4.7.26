import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { revokeDelegation } from '../../../../lib/compliance-delegation-service'

export const DELETE = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Delegation ID is required' }, { status: 400 })

    const delegation = await revokeDelegation(id)
    return NextResponse.json({ delegation })

})
