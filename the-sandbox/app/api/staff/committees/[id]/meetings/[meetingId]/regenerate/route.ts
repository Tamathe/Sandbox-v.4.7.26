import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { regenerateMinutes } from '../../../../../../../lib/staff/minutes-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { meetingId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { additionalNotes } = parsed.data as { additionalNotes?: string }

  const result = await regenerateMinutes(meetingId, additionalNotes)
  return NextResponse.json(result)
})
