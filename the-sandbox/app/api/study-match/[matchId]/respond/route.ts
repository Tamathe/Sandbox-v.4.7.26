import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { respondToMatch } from '../../../../lib/study-match-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth
    const { matchId } = await params

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { action: string }

    if (body.action !== 'accept' && body.action !== 'decline') {
      return NextResponse.json(
        { error: 'action must be "accept" or "decline"' },
        { status: 400 },
      )
    }

    const result = await respondToMatch(matchId, user.id, body.action)
    return NextResponse.json(result)
  })
