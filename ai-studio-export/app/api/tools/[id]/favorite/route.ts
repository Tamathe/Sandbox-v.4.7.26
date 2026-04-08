import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tool = await prisma.tool.findUnique({ where: { id } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_toolId: { userId: user.id, toolId: id } },
    })

    if (existing) {
      await prisma.favorite.delete({
        where: { userId_toolId: { userId: user.id, toolId: id } },
      })
      const count = await prisma.favorite.count({ where: { toolId: id } })
      return NextResponse.json({ favorited: false, count })
    } else {
      await prisma.favorite.create({ data: { userId: user.id, toolId: id } })
      const count = await prisma.favorite.count({ where: { toolId: id } })
      return NextResponse.json({ favorited: true, count })
    }
  } catch (error) {
    console.error('POST /api/tools/[id]/favorite error:', error)
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 })
  }
}
