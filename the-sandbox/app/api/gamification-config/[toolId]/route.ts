import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params
  const config = await prisma.gamificationConfig.findUnique({ where: { toolId } })
  return NextResponse.json(config ?? {})
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
  try {
    const { toolId } = await params
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || (user.role !== 'EDUCATOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tool = await prisma.tool.findUnique({ where: { id: toolId } })
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    if (tool.creatorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const config = await prisma.gamificationConfig.upsert({
      where: { toolId },
      update: {
        xpPerMessage: body.xpPerMessage ?? 2,
        xpPerSession: body.xpPerSession ?? 10,
        xpHighGrade: body.xpHighGrade ?? 25,
        questsEnabled: body.questsEnabled ?? false,
        questsJson: body.questsJson ?? null,
        badgesJson: body.badgesJson ?? null,
      },
      create: {
        toolId,
        xpPerMessage: body.xpPerMessage ?? 2,
        xpPerSession: body.xpPerSession ?? 10,
        xpHighGrade: body.xpHighGrade ?? 25,
        questsEnabled: body.questsEnabled ?? false,
        questsJson: body.questsJson ?? null,
        badgesJson: body.badgesJson ?? null,
      },
    })

    // Create tool-specific quests if provided
    if (body.quests && Array.isArray(body.quests) && body.quests.length > 0) {
      for (const q of body.quests) {
        if (q.title && q.xpReward) {
          await prisma.quest.create({
            data: {
              title: q.title,
              description: q.description ?? '',
              xpReward: q.xpReward,
              toolId,
              condition: JSON.stringify(q.condition ?? { type: 'sessions', count: 3 }),
            },
          })
        }
      }
    }

    return NextResponse.json(config)
  } catch (err) {
    console.error('POST /api/gamification-config error:', err)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
