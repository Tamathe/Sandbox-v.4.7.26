import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { acknowledgeEvent } from '../../../../../lib/campus-pulse/campus-pulse-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { eventId } = await params
  await acknowledgeEvent(eventId, auth.user.id)

  return NextResponse.json({ success: true })
})
