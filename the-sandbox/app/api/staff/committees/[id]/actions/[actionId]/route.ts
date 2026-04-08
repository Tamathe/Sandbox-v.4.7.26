import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { updateActionItemStatus } from '../../../../../../lib/staff/minutes-service'

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string; actionId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { actionId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { status, notes } = parsed.data as { status: string; notes?: string }

  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: 'status is required' }, { status: 400 })
  }

  const actionItem = await updateActionItemStatus(actionId, status, notes)
  return NextResponse.json(actionItem)
})
