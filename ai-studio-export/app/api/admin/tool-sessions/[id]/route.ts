import { NextRequest, NextResponse } from 'next/server'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'
import { prisma } from '../../../../lib/prisma'
import { isAuthFailure, requireAdminUser } from '../../../../lib/server-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) {
      return auth.response
    }
    const { user: admin } = auth
    const { id } = await params

    const session = await prisma.toolSession.findUnique({
      where: { id },
      include: {
        tool: { select: { id: true, name: true, category: true } },
        user: { select: { id: true, name: true, email: true } },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            flagged: true,
            flagCategory: true,
            flagReason: true,
            inputTokens: true,
            outputTokens: true,
            tokensUsed: true,
            createdAt: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await recordAdminAudit({
      adminId: admin.id,
      action: 'transcript_viewed',
      targetType: 'TOOL_SESSION',
      targetId: session.id,
      targetLabel: session.tool?.name ?? session.id,
      metadata: {
        sessionUserId: session.userId,
        toolId: session.toolId,
      },
    })

    return NextResponse.json({ session })
  } catch (error) {
    console.error('GET /api/admin/tool-sessions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 })
  }
}
