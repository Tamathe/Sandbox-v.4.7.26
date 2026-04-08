import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const tool = await prisma.tool.update({
      where: { id },
      data: body,
      include: {
        creator: true,
        _count: { select: { upvotes: true, favorites: true, comments: true } },
      },
    })

    return NextResponse.json(tool)
  } catch (error) {
    console.error('PUT /api/admin/tools/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete related records first
    await prisma.metricEvent.deleteMany({ where: { toolId: id } })
    await prisma.toolSession.deleteMany({ where: { toolId: id } })
    await prisma.comment.deleteMany({ where: { toolId: id } })
    await prisma.upvote.deleteMany({ where: { toolId: id } })
    await prisma.favorite.deleteMany({ where: { toolId: id } })
    await prisma.customMetricDefinition.deleteMany({ where: { toolId: id } })
    await prisma.tool.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/tools/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 })
  }
}
