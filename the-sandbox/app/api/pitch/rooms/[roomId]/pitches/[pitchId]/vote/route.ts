import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../../../../lib/server-auth'
import { votePitch } from '../../../../../../../lib/pitch'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; pitchId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { pitchId } = await params
  try {
    const result = await votePitch(pitchId, auth.user.id)
    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Vote error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
