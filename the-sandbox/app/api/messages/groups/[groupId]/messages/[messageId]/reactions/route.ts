import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import { toggleReaction } from '../../../../../../../lib/messages/reaction-service'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

// POST /api/messages/groups/[groupId]/messages/[messageId]/reactions
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; messageId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { messageId } = await params

  const parsed = await parseRequestBody<{ emoji?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  if (!body.emoji || typeof body.emoji !== 'string') {
    return NextResponse.json({ error: 'emoji is required' }, { status: 400 })
  }

  const result = await toggleReaction(user.id, messageId, body.emoji)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
})
