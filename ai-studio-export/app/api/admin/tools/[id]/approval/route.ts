import { NextRequest, NextResponse } from 'next/server'
import { recordAdminAudit } from '../../../../../lib/admin-control-tower'
import { prisma } from '../../../../../lib/prisma'
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../../../../lib/server-auth'
import { validateBody } from '../../../../../lib/validate'
import { AdminToolApprovalSchema } from '../../../../../lib/schemas'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(AdminToolApprovalSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { approvalStatus, suspendedReason: rawReason } = validation.value
  const suspendedReason = rawReason?.trim() || 'Suspended by an administrator'

  const tool = await prisma.tool.findUnique({ where: { id } })
  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const isAdmin = user.role === 'ADMIN'
  const isCreatorRequestingPending =
    tool.creatorId === user.id &&
    approvalStatus === 'PENDING'

  if (!isAdmin && !isCreatorRequestingPending) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.tool.update({
    where: { id },
    data: {
      approvalStatus,
      suspendedAt: approvalStatus === 'SUSPENDED' ? new Date() : null,
      suspendedReason: approvalStatus === 'SUSPENDED' ? suspendedReason : null,
    },
    include: {
      creator: true,
      _count: { select: { upvotes: true, favorites: true, comments: true, sessions: true } },
    },
  })

  await recordAdminAudit({
    adminId: user.id,
    action: `tool_${approvalStatus.toLowerCase()}`,
    targetType: 'TOOL',
    targetId: updated.id,
    targetLabel: updated.name,
    metadata: approvalStatus === 'SUSPENDED' ? { suspendedReason } : { approvalStatus },
  })

  return NextResponse.json({ tool: updated })
}
