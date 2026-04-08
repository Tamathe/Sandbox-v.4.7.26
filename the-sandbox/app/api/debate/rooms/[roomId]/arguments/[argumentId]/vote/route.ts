import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../../../../lib/server-auth'
import { voteArgument } from '../../../../../../../lib/debate'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; argumentId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { argumentId } = await params

  try {
    const result = await voteArgument(argumentId, auth.user.id)
    return NextResponse.json({ ok: true, voted: result.voted })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to vote'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
