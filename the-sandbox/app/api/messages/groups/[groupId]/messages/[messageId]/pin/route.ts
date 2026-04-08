import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../../../lib/server-auth'
import { togglePin } from '../../../../../../../lib/messages/pin-service'

// POST /api/messages/groups/[groupId]/messages/[messageId]/pin
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; messageId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId, messageId } = await params

  const result = await togglePin(user.id, groupId, messageId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
})
