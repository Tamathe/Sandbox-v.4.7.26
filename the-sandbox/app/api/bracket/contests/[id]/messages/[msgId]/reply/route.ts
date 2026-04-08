import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../../../lib/server-auth'
import { postMessage } from '../../../../../../../lib/bracket/bracket-service'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id, msgId } = await params

  const parsed = await parseRequestBody<{ content?: string }>(request)
  if ('error' in parsed) return parsed.error

  if (!parsed.data.content || typeof parsed.data.content !== 'string' || !parsed.data.content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const message = await postMessage(id, auth.user.id, parsed.data.content, false, msgId)
  return NextResponse.json({ message }, { status: 201 })
})
