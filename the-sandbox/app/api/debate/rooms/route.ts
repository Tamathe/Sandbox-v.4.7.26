import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { listRoomsForUser, createRoom } from '../../../lib/debate'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const rooms = await listRoomsForUser(auth.user.id)
  return NextResponse.json({ rooms }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const parsed = await parseRequestBody<{ title: unknown; proposition: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { title, proposition } = parsed.data

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!proposition || typeof proposition !== 'string' || !proposition.trim()) {
    return NextResponse.json({ error: 'proposition is required' }, { status: 400 })
  }

  const room = await createRoom(auth.user.id, title.trim(), proposition.trim())
  return NextResponse.json({ room }, { status: 201 })
})
