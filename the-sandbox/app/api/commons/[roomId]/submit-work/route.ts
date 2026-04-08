import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { submitWork } from '../../../../lib/commons/peer-review-engine'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { content } = parsed.data as { content: string }

  try {
    await submitWork(roomId, auth.user.id, content)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const e = err as { message: string; status?: number }
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
})
