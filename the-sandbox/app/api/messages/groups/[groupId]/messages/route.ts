import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import {
  getGroupGeneralChannel,
  getThreadMessages,
  sendThreadMessage,
} from '../../../../../lib/messages/thread-service'

// GET /api/messages/groups/[groupId]/messages?after=<ISO>&limit=50
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const channelResult = await getGroupGeneralChannel(user.id, groupId)
  if ('error' in channelResult) {
    return NextResponse.json({ error: channelResult.error }, { status: channelResult.status })
  }

  const url = new URL(request.url)
  const after = url.searchParams.get('after') ?? undefined
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)

  const messages = await getThreadMessages(channelResult.channelId, { after, limit }, user.id)
  return NextResponse.json({ messages, channelId: channelResult.channelId }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST /api/messages/groups/[groupId]/messages
// Body: { content: string, replyToId?: string }
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const channelResult = await getGroupGeneralChannel(user.id, groupId)
  if ('error' in channelResult) {
    return NextResponse.json({ error: channelResult.error }, { status: channelResult.status })
  }

  const parsed = await parseRequestBody<{
    content?: string
    replyToId?: string
    attachmentUrl?: string
    attachmentName?: string
    attachmentType?: string
  }>(request)
  if ('error' in parsed) return parsed.error
  const { content, replyToId, attachmentUrl, attachmentName, attachmentType } = parsed.data

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const attachment =
    attachmentUrl && attachmentName && attachmentType
      ? { url: attachmentUrl, name: attachmentName, type: attachmentType }
      : null

  const result = await sendThreadMessage(
    user.id,
    channelResult.channelId,
    content,
    replyToId,
    attachment,
  )

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, { status: 201 })
})
