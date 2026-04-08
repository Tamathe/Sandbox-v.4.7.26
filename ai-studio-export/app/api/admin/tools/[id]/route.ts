import { NextRequest, NextResponse } from 'next/server'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'
import { prisma } from '../../../../lib/prisma'
import { requireAdminUser } from '../../../../lib/server-auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireAdminUser(req)
    if ('response' in auth) {
      return auth.response
    }
    const { user } = auth

    const body = await req.json()
    const updateData: { featured?: boolean } = {}

    if (typeof body.featured === 'boolean') {
      updateData.featured = body.featured
    }

    const tool = await prisma.tool.update({
      where: { id },
      data: updateData,
      include: {
        creator: true,
        _count: { select: { upvotes: true, favorites: true, comments: true } },
      },
    })

    await recordAdminAudit({
      adminId: user.id,
      action: tool.featured ? 'tool_featured' : 'tool_unfeatured',
      targetType: 'TOOL',
      targetId: tool.id,
      targetLabel: tool.name,
      metadata: { featured: tool.featured },
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
    const auth = await requireAdminUser(req)
    if ('response' in auth) {
      return auth.response
    }
    const { user } = auth

    const existingTool = await prisma.tool.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Delete related records first
    await prisma.metricEvent.deleteMany({ where: { toolId: id } })
    await prisma.toolSession.deleteMany({ where: { toolId: id } })
    await prisma.comment.deleteMany({ where: { toolId: id } })
    await prisma.upvote.deleteMany({ where: { toolId: id } })
    await prisma.favorite.deleteMany({ where: { toolId: id } })
    await prisma.customMetricDefinition.deleteMany({ where: { toolId: id } })
    await prisma.tool.delete({ where: { id } })

    await recordAdminAudit({
      adminId: user.id,
      action: 'tool_deleted',
      targetType: 'TOOL',
      targetId: existingTool.id,
      targetLabel: existingTool.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/tools/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 })
  }
}
