import { NextRequest, NextResponse } from 'next/server'

import { CollabMessageRole, CollabSessionStatus } from '../../../../../generated/prisma'
import {
  awardCollabMessageXp,
  buildCollabAnthropicMessages,
  buildCollabSystemPrompt,
  createAnthropicClient,
  createCollabError,
  getAuthorizedParticipantSession,
  getUserByEmail,
  loadCollabSession,
  resolveCourseSyllabusContext,
  serializeCollabMessage,
  withCollabAiLock,
} from '../../../../../lib/collab'
import { publishToCollabSession } from '../../../../../lib/collab-bus'
import { prisma } from '../../../../../lib/prisma'

export const runtime = 'nodejs'

function generateAssistantMessageId() {
  return `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserByEmail(request.headers.get('x-demo-user-email'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const session = await getAuthorizedParticipantSession(id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    return NextResponse.json(session.messages.map(serializeCollabMessage))
  } catch (error) {
    console.error('GET /api/collab/sessions/[id]/messages error:', error)
    return NextResponse.json({ error: 'Failed to load message history' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserByEmail(request.headers.get('x-demo-user-email'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const session = await getAuthorizedParticipantSession(id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    if (session.status === CollabSessionStatus.ENDED || session.status === CollabSessionStatus.EXPIRED) {
      return NextResponse.json({ error: 'This session has already ended.' }, { status: 409 })
    }

    if (session.mode === 'TURN_BASED' && session.currentTurnUserId && session.currentTurnUserId !== user.id) {
      return NextResponse.json({ error: 'It is not your turn right now.' }, { status: 403 })
    }

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const clientMessageId =
      typeof body.clientMessageId === 'string' && body.clientMessageId.trim()
        ? body.clientMessageId.trim()
        : null

    if (!content) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 })
    }

    const participant = session.participants.find((entry) => entry.userId === user.id)
    if (!participant || !participant.isActive) {
      return NextResponse.json({ error: 'Join the session again before sending a message.' }, { status: 403 })
    }

    const createdUserMessage = await prisma.collabMessage.create({
      data: {
        collabSessionId: session.id,
        senderId: user.id,
        role: CollabMessageRole.USER,
        content,
        clientMessageId,
        turnNumber: session.turnNumber || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    await prisma.$transaction([
      prisma.collabParticipant.update({
        where: { id: participant.id },
        data: { messageCount: { increment: 1 } },
      }),
      prisma.toolSession.update({
        where: { id: participant.toolSessionId! },
        data: { messageCount: { increment: 1 } },
      }),
    ])

    publishToCollabSession(session.id, {
      type: 'new_message',
      payload: serializeCollabMessage(createdUserMessage),
    })

    await awardCollabMessageXp(user.id, session.toolId)

    await withCollabAiLock(session.id, async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        publishToCollabSession(session.id, createCollabError('AI chat is unavailable on this deployment.', 'AI_UNAVAILABLE'))
        return
      }

      const lockedSession = await loadCollabSession(session.id)
      if (!lockedSession) return

      const syllabusContext = await resolveCourseSyllabusContext(lockedSession.toolId, lockedSession.courseId)
      const systemPrompt = buildCollabSystemPrompt(lockedSession, syllabusContext)
      const anthropicMessages = buildCollabAnthropicMessages(lockedSession).slice(-30)
      const assistantMessageId = generateAssistantMessageId()
      const client = createAnthropicClient()
      let fullAssistantResponse = ''

      const stream = client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      }, { signal: AbortSignal.timeout(60_000) })

      try {
        for await (const chunk of stream) {
          if (chunk.type !== 'content_block_delta' || chunk.delta.type !== 'text_delta') continue
          fullAssistantResponse += chunk.delta.text
          publishToCollabSession(lockedSession.id, {
            type: 'ai_stream_chunk',
            payload: {
              chunk: chunk.delta.text,
              messageId: assistantMessageId,
            },
          })
        }
      } catch (err) {
        console.error('Collab AI stream error:', err)
        const isRateLimit = err instanceof Error && err.message.includes('429')
        const isAuth = err instanceof Error && (err.message.includes('401') || err.message.includes('authentication'))
        const isTimeout = err instanceof Error && err.message.includes('abort')
        const userMsg = isRateLimit
          ? 'The AI service is temporarily busy. Please wait a moment and try again.'
          : isAuth
          ? 'AI service configuration error. Please contact support.'
          : isTimeout
          ? 'The request timed out. Please try again.'
          : 'AI response was interrupted. Please try again.'
        publishToCollabSession(lockedSession.id, createCollabError(userMsg, 'AI_STREAM_INTERRUPTED'))
      }

      if (!fullAssistantResponse.trim()) return

      const assistantMessage = await prisma.collabMessage.create({
        data: {
          id: assistantMessageId,
          collabSessionId: lockedSession.id,
          role: CollabMessageRole.ASSISTANT,
          content: fullAssistantResponse,
          turnNumber: lockedSession.turnNumber || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      publishToCollabSession(lockedSession.id, {
        type: 'ai_stream_end',
        payload: {
          messageId: assistantMessage.id,
          fullContent: fullAssistantResponse,
          createdAt: assistantMessage.createdAt.toISOString(),
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/collab/sessions/[id]/messages error:', error)
    return NextResponse.json({ error: 'Failed to send collaborative message' }, { status: 500 })
  }
}
