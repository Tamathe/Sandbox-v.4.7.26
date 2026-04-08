import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../lib/server-auth'
import { getRoom } from '../../../../lib/pitch'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { roomId } = await params
  const room = await getRoom(roomId, auth.user.id)
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ room }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
