import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { openVoting, closeRoom } from '../../../../../lib/pitch'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { roomId } = await params
  const parsed = await parseRequestBody<{ action?: string }>(request)
  if ('error' in parsed) return parsed.error
  const { action } = parsed.data

  try {
    if (action === 'open_voting') {
      const room = await openVoting(roomId, auth.user.id)
      return NextResponse.json({ status: room.status })
    }
    if (action === 'close') {
      const room = await closeRoom(roomId, auth.user.id)
      return NextResponse.json({ status: room.status })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Status update error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
