import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import {
  getSession,
  scoreSession,
} from '../../../../../../lib/ai-literacy/study-coach-service'

export const POST = withErrorHandling(
  async (req: NextRequest, context: { params: Promise<{ sessionId: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { sessionId } = await context.params
    const session = await getSession(sessionId)

    if (session.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (session.completedAt) {
      return NextResponse.json(
        { error: 'Session already scored' },
        { status: 400 },
      )
    }

    const result = await scoreSession(sessionId)
    return NextResponse.json(result)
  },
)
