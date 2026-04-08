import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getPinnedMessages } from '../../../../../lib/messages/pin-service'

// GET /api/messages/groups/[groupId]/pinned
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const result = await getPinnedMessages(user.id, groupId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ pinned: result }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
