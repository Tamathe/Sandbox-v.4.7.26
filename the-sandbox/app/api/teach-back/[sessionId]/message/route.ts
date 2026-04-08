import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { sendTeachBackMessage } from '../../../../lib/teach-back-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const { sessionId } = await params

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { message: string }

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const result = await sendTeachBackMessage(sessionId, user.id, body.message)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  })
