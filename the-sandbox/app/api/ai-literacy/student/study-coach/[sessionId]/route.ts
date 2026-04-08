import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import {
  getSession,
  processMessage,
} from '../../../../../lib/ai-literacy/study-coach-service'

export const GET = withErrorHandling(
  async (req: NextRequest, context: { params: Promise<{ sessionId: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { sessionId } = await context.params
    const session = await getSession(sessionId)

    // Ensure user owns this session
    if (session.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ session })
  },
)

export const POST = withErrorHandling(
  async (req: NextRequest, context: { params: Promise<{ sessionId: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { sessionId } = await context.params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { message: string }
    const { message } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify ownership
    const session = await getSession(sessionId)
    if (session.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (session.completedAt) {
      return NextResponse.json(
        { error: 'Session is already completed' },
        { status: 400 },
      )
    }

    const { stream } = await processMessage(sessionId, message.trim())

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  },
)
