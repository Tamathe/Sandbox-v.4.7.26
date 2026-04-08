import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

const VALID_STATUSES = ['APPROVED', 'REJECTED', 'PENDING', 'COMMUNITY'] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = req.headers.get('x-demo-user-email')
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const approvalStatus = body.approvalStatus as string

  if (!VALID_STATUSES.includes(approvalStatus as ValidStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

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
    data: { approvalStatus: approvalStatus as ValidStatus },
    include: {
      creator: true,
      _count: { select: { upvotes: true, favorites: true, comments: true, sessions: true } },
    },
  })

  return NextResponse.json({ tool: updated })
}
