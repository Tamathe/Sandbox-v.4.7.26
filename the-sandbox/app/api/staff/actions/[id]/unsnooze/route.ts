import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { unsnoozeAction } from '../../../../../lib/staff/action-queue-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const item = await unsnoozeAction(id)

  return NextResponse.json({ item })
})
