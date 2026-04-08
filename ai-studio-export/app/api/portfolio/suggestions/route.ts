import { NextRequest, NextResponse } from 'next/server'
import type { PortfolioType } from '../../../generated/prisma'
import { prisma } from '../../../lib/prisma'
import { getMetadataString } from '../../../lib/portfolio'

type SuggestionItem = {
  id: string
  kind: 'TOOL' | 'QUEST'
  title: string
  description: string
  suggestedType: PortfolioType
  draftItem: {
    type: PortfolioType
    title: string
    organization?: string
    description?: string
    skills?: string[]
    metadata?: Record<string, unknown>
    isVerified?: boolean
  }
}

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const [tools, completedQuests, existingItems] = await Promise.all([
    prisma.tool.findMany({
      where: { creatorId: user.id, published: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    }),
    prisma.userPlatformQuest.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      include: {
        quest: true,
      },
    }),
    prisma.portfolioItem.findMany({
      where: { userId: user.id },
      select: { metadata: true },
    }),
  ])

  const existingToolIds = new Set(
    existingItems
      .map((item) => getMetadataString(item.metadata, 'toolId'))
      .filter((value): value is string => Boolean(value))
  )

  const existingQuestIds = new Set(
    existingItems
      .map((item) => getMetadataString(item.metadata, 'questId'))
      .filter((value): value is string => Boolean(value))
  )

  const toolSuggestions: SuggestionItem[] = tools
    .filter((tool) => !existingToolIds.has(tool.id))
    .map((tool) => ({
      id: tool.id,
      kind: 'TOOL',
      title: tool.name,
      description:
        tool._count.sessions > 0
          ? `Published on The Sandbox · used in ${tool._count.sessions} session${tool._count.sessions === 1 ? '' : 's'}`
          : 'Published on The Sandbox and ready to showcase as a project',
      suggestedType: 'PROJECT',
      draftItem: {
        type: 'PROJECT',
        title: tool.name,
        organization: 'The Sandbox',
        description: tool.shortDescription,
        skills: [],
        metadata: {
          toolId: tool.id,
          toolType: tool.toolType,
          category: tool.category,
        },
        isVerified: true,
      },
    }))

  const questSuggestions: SuggestionItem[] = completedQuests
    .filter((questProgress) => !existingQuestIds.has(questProgress.questId))
    .map((questProgress) => ({
      id: questProgress.questId,
      kind: 'QUEST',
      title: questProgress.quest.title,
      description: `Completed on The Sandbox · earned ${questProgress.quest.xpReward} XP`,
      suggestedType: 'AWARD',
      draftItem: {
        type: 'AWARD',
        title: questProgress.quest.title,
        organization: 'The Sandbox',
        description: questProgress.quest.description,
        skills: [],
        metadata: {
          questId: questProgress.questId,
          cadence: questProgress.quest.cadence,
        },
        isVerified: true,
      },
    }))

  return NextResponse.json({
    suggestions: [...toolSuggestions, ...questSuggestions].slice(0, 5),
  })
}
