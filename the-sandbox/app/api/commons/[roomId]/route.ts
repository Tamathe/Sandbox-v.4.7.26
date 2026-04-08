import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getLiveRoom, getRoundsForReview } from '../../../lib/commons/commons-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  try {
    const room = await getLiveRoom(roomId)

    // Include rounds for completed rooms (review answers feature)
    let rounds = null
    if (room.phase === 'COMPLETE') {
      rounds = await getRoundsForReview(roomId)
    }

    return NextResponse.json({ ...room, rounds }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (err: unknown) {
    const e = err as { message: string; status?: number }
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
})
