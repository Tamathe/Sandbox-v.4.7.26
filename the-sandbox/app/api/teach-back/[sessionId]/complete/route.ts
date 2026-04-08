import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../../../lib/server-auth'
import { completeTeachBack } from '../../../../lib/teach-back-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const { sessionId } = await params

    const result = await completeTeachBack(sessionId, user.id)
    return NextResponse.json(result)
  })
