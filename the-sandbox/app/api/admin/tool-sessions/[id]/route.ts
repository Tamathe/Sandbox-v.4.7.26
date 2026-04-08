import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'
import { prisma } from '../../../../lib/prisma'
import { isAuthFailure, requireAdminUser } from '../../../../lib/server-auth'

export const GET = withErrorHandling(async (req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) {
      return auth.response
    }
    const { user: admin } = auth
    const { id } = await params

    // sensitiveSession: false — exclude counseling/disability/immigration sessions per FERPA policy
    const session = await prisma.toolSession.findUnique({
      where: { id, sensitiveSession: false },
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

    return NextResponse.json({ session }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
