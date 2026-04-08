import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../../lib/server-auth'
import { requestVerdict } from '../../../../../lib/debate'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { roomId } = await params

  try {
    await requestVerdict(roomId, auth.user.id)
    return NextResponse.json({ status: 'JUDGING' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to request verdict'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
