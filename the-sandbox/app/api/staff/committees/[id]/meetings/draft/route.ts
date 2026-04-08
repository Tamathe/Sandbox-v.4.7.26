import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { createMeetingDraft } from '../../../../../../lib/staff/minutes-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const meeting = await createMeetingDraft(id)
  return NextResponse.json({ meeting }, { status: 201 })
})
