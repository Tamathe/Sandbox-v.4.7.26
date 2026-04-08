import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { removeMember } from '../../../../../../lib/messages/group-management-service'

// DELETE /api/messages/groups/[groupId]/members/[userId] — remove member
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId, userId: targetUserId } = await params

  const result = await removeMember(user.id, groupId, targetUserId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
})
