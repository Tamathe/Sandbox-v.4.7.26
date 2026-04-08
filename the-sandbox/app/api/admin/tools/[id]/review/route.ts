import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

type ReviewAction = 'approve-review' | 'flag-for-review' | 'clear-review'

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id: toolId } = await params

  const body = await parseRequestBody<{ action: ReviewAction }>(request)
  if ('error' in body) return body.error

  const { action } = body.data
  if (!action || !['approve-review', 'flag-for-review', 'clear-review'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const tool = await prisma.tool.findUnique({ where: { id: toolId }, select: { id: true, name: true } })
  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const now = new Date()

  if (action === 'approve-review') {
    const expiresAt = new Date(now)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await prisma.tool.update({
      where: { id: toolId },
      data: {
        reviewedBy: user.email,
        reviewedAt: now,
        reviewExpiresAt: expiresAt,
        requiresInstitutionalReview: true,
      },
    })
  } else if (action === 'flag-for-review') {
    await prisma.tool.update({
      where: { id: toolId },
      data: { requiresInstitutionalReview: true },
    })
  } else {
    // clear-review
    await prisma.tool.update({
      where: { id: toolId },
      data: {
        requiresInstitutionalReview: false,
        reviewedBy: null,
        reviewedAt: null,
        reviewExpiresAt: null,
      },
    })
  }

  // Log to AdminAuditLog
  await prisma.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: `institutional-review:${action}`,
      targetType: 'Tool',
      targetId: toolId,
      targetLabel: tool.name,
      metadata: { action },
    },
  })

  return NextResponse.json({ ok: true })
})
