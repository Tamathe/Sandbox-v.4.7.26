import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { getMessages, postMessage } from '../../../../../lib/bracket/bracket-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id } = await params
  const messages = await getMessages(id)
  return NextResponse.json({ messages }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id } = await params

  const parsed = await parseRequestBody<{ content?: string; parentId?: string }>(request)
  if ('error' in parsed) return parsed.error

  if (!parsed.data.content || typeof parsed.data.content !== 'string' || !parsed.data.content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const message = await postMessage(id, auth.user.id, parsed.data.content, false, parsed.data.parentId)
  return NextResponse.json({ message }, { status: 201 })
})
