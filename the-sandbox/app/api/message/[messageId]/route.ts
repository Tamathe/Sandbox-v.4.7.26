import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { editMessage, deleteMessage } from '../../../lib/messages/message-actions-service'
import { withErrorHandling } from '../../../lib/api-utils'

// PATCH /api/message/[messageId] — edit a message
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { messageId } = await params

  const parsed = await parseRequestBody<{ content?: string }>(request)
  if ('error' in parsed) return parsed.error
  const { content } = parsed.data

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const result = await editMessage(user.id, messageId, content)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
})

// DELETE /api/message/[messageId] — soft-delete a message
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { messageId } = await params

  const result = await deleteMessage(user.id, messageId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
})
