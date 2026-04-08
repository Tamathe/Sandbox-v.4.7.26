import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      auditEntries: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isRegistrarOrAdmin = auth.user.role === 'REGISTRAR' || auth.user.role === 'ADMIN'
  if (!isRegistrarOrAdmin && petition.studentId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ petition }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (petition.studentId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (petition.status !== 'SUBMITTED') {
    return NextResponse.json({ error: 'Only SUBMITTED petitions can be withdrawn.' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.petition.update({ where: { id }, data: { status: 'WITHDRAWN' } }),
    prisma.petitionAuditEntry.create({
      data: {
        petitionId: id,
        actorId: auth.user.id,
        action: 'WITHDRAWN',
        note: 'Petition withdrawn by student.',
      },
    }),
  ])

  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
