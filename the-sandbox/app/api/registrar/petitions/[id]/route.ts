import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    status?: string
    decision?: string
    decisionReason?: string
    note?: string
  }>(request)
  if ('error' in parsed) return parsed.error

  const { status, decision, decisionReason, note } = parsed.data

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Petition not found' }, { status: 404 })

  const [updated] = await prisma.$transaction([
    prisma.petition.update({
      where: { id },
      data: {
        ...(status ? { status: status as never } : {}),
        ...(decision ? { decision: decision as never, decisionReason, reviewedBy: auth.user.id, reviewedAt: new Date() } : {}),
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        auditEntries: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.petitionAuditEntry.create({
      data: {
        petitionId: id,
        actorId: auth.user.id,
        action: decision ? `DECISION_${decision}` : `STATUS_${status}`,
        note: note ?? decisionReason,
      },
    }),
  ])

  return NextResponse.json({ petition: updated })
})
