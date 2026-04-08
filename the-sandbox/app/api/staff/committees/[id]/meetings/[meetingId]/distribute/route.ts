import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { distributeMinutes } from '../../../../../../../lib/staff/minutes-distribution'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { meetingId } = await params
  await distributeMinutes(meetingId)
  return NextResponse.json({ success: true, meetingId })
})
