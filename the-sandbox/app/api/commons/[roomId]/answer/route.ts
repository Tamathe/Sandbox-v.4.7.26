import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { recordAnswer } from '../../../../lib/commons/commons-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { roundId, selectedIndex } = parsed.data as { roundId: string; selectedIndex: number }

  if (!roundId || typeof selectedIndex !== 'number') {
    return NextResponse.json({ error: 'roundId and selectedIndex are required' }, { status: 400 })
  }

  try {
    const result = await recordAnswer(roomId, auth.user.id, roundId, selectedIndex)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const e = err as { message: string; status?: number }
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
})
