import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string; sessionId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth
    const { toolId, sessionId } = await params

    // Verify the session belongs to this user and tool
    const session = await prisma.toolSession.findFirst({
      where: { id: sessionId, toolId, userId: user.id },
      select: { id: true, notes: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    })

    return NextResponse.json(messages, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
