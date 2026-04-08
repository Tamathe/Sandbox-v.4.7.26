import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { markThreadAsRead } from '../../../../../lib/messages/read-receipt-service'

// POST /api/messages/groups/[groupId]/read
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const result = await markThreadAsRead(user.id, groupId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
})
