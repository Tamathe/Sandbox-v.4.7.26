import { prisma } from '../prisma'
import type { ContributeTargetType, FeedbackType, CampusTipType } from '../../generated/prisma'

// ── Content Feedback ────────────────────────────────────────────────────────

export async function submitFeedback(
  userId: string,
  data: { targetType: ContributeTargetType; targetId: string; feedbackType: FeedbackType; content: string },
) {
  return prisma.contentFeedback.create({
    data: { userId, ...data },
  })
}

export async function getFeedbackForTarget(targetType: ContributeTargetType, targetId: string) {
  return prisma.contentFeedback.findMany({
    where: { targetType, targetId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getUserFeedback(userId: string) {
  return prisma.contentFeedback.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getEducatorFeedbackInsights(educatorId: string) {
  // Get all tools created by this educator, then aggregate feedback
  const tools = await prisma.tool.findMany({
    where: { creatorId: educatorId },
    select: { id: true, name: true },
  })
  const toolIds = tools.map((t) => t.id)
  if (toolIds.length === 0) return { tools: [], totalFeedback: 0, byType: {} }

  const feedback = await prisma.contentFeedback.findMany({
    where: { targetType: 'TOOL', targetId: { in: toolIds } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const byType: Record<string, number> = {}
  for (const f of feedback) {
    byType[f.feedbackType] = (byType[f.feedbackType] || 0) + 1
  }

  const toolFeedback = tools.map((t) => ({
    ...t,
    feedbackCount: feedback.filter((f) => f.targetId === t.id).length,
    recentFeedback: feedback.filter((f) => f.targetId === t.id).slice(0, 5),
  }))

  return { tools: toolFeedback, totalFeedback: feedback.length, byType }
}

// ── Student Collections ─────────────────────────────────────────────────────

export async function createCollection(
  userId: string,
  data: { title: string; description?: string; emoji?: string; isPublic?: boolean },
) {
  return prisma.studentCollection.create({
    data: { userId, ...data },
    include: { items: { include: { tool: { select: { id: true, name: true, shortDescription: true, category: true } } } } },
  })
}

export async function getUserCollections(userId: string) {
  return prisma.studentCollection.findMany({
    where: { userId },
    include: {
      items: {
        include: { tool: { select: { id: true, name: true, shortDescription: true, category: true } } },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { saves: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getPublicCollections(take = 20, skip = 0) {
  return prisma.studentCollection.findMany({
    where: { isPublic: true },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      items: {
        include: { tool: { select: { id: true, name: true, shortDescription: true, category: true } } },
        orderBy: { displayOrder: 'asc' },
        take: 5,
      },
      _count: { select: { saves: true, items: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take,
    skip,
  })
}

export async function getCollection(collectionId: string) {
  return prisma.studentCollection.findUnique({
    where: { id: collectionId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      items: {
        include: { tool: { select: { id: true, name: true, shortDescription: true, category: true, toolType: true } } },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { saves: true } },
    },
  })
}

export async function updateCollection(
  collectionId: string,
  userId: string,
  data: { title?: string; description?: string; emoji?: string; isPublic?: boolean },
) {
  return prisma.studentCollection.updateMany({
    where: { id: collectionId, userId },
    data,
  })
}

export async function deleteCollection(collectionId: string, userId: string) {
  return prisma.studentCollection.deleteMany({
    where: { id: collectionId, userId },
  })
}

export async function addCollectionItem(collectionId: string, userId: string, toolId: string, note?: string) {
  // Verify ownership
  const collection = await prisma.studentCollection.findFirst({ where: { id: collectionId, userId } })
  if (!collection) return null

  const maxOrder = await prisma.studentCollectionItem.aggregate({
    where: { collectionId },
    _max: { displayOrder: true },
  })

  return prisma.studentCollectionItem.create({
    data: {
      collectionId,
      toolId,
      note,
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
    },
    include: { tool: { select: { id: true, name: true, shortDescription: true, category: true } } },
  })
}

export async function removeCollectionItem(collectionId: string, userId: string, toolId: string) {
  const collection = await prisma.studentCollection.findFirst({ where: { id: collectionId, userId } })
  if (!collection) return null

  return prisma.studentCollectionItem.deleteMany({
    where: { collectionId, toolId },
  })
}

export async function toggleCollectionSave(userId: string, collectionId: string) {
  const existing = await prisma.collectionSave.findUnique({
    where: { userId_collectionId: { userId, collectionId } },
  })
  if (existing) {
    await prisma.collectionSave.delete({ where: { userId_collectionId: { userId, collectionId } } })
    const count = await prisma.collectionSave.count({ where: { collectionId } })
    return { saved: false, count }
  }
  await prisma.collectionSave.create({ data: { userId, collectionId } })
  const count = await prisma.collectionSave.count({ where: { collectionId } })
  return { saved: true, count }
}

// ── Improvement Suggestions ─────────────────────────────────────────────────

export async function submitSuggestion(
  userId: string,
  data: { targetType: ContributeTargetType; targetId: string; suggestion: string },
) {
  return prisma.improvementSuggestion.create({
    data: { userId, ...data },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
}

export async function getSuggestionsForTarget(targetType: ContributeTargetType, targetId: string) {
  return prisma.improvementSuggestion.findMany({
    where: { targetType, targetId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { upvotes: true } },
    },
    orderBy: { upvoteCount: 'desc' },
  })
}

export async function getUserSuggestions(userId: string) {
  return prisma.improvementSuggestion.findMany({
    where: { userId },
    include: { _count: { select: { upvotes: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getTopSuggestions(take = 20) {
  return prisma.improvementSuggestion.findMany({
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { upvotes: true } },
    },
    orderBy: { upvoteCount: 'desc' },
    take,
  })
}

export async function toggleSuggestionUpvote(userId: string, suggestionId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.suggestionUpvote.findUnique({
      where: { userId_suggestionId: { userId, suggestionId } },
    })
    if (existing) {
      await tx.suggestionUpvote.delete({ where: { userId_suggestionId: { userId, suggestionId } } })
      const suggestion = await tx.improvementSuggestion.update({
        where: { id: suggestionId },
        data: { upvoteCount: { decrement: 1 } },
      })
      return { upvoted: false, count: suggestion.upvoteCount }
    }
    await tx.suggestionUpvote.create({ data: { userId, suggestionId } })
    const suggestion = await tx.improvementSuggestion.update({
      where: { id: suggestionId },
      data: { upvoteCount: { increment: 1 } },
    })
    return { upvoted: true, count: suggestion.upvoteCount }
  })
}

// ── Campus Tips ─────────────────────────────────────────────────────────────

export async function submitCampusTip(
  userId: string,
  data: { buildingId: string; tipType: CampusTipType; content: string },
) {
  return prisma.campusTip.create({
    data: { userId, ...data },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
}

export async function getTipsForBuilding(buildingId: string) {
  return prisma.campusTip.findMany({
    where: { buildingId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { upvotes: true } },
    },
    orderBy: { upvoteCount: 'desc' },
  })
}

export async function getUserCampusTips(userId: string) {
  return prisma.campusTip.findMany({
    where: { userId },
    include: { _count: { select: { upvotes: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function toggleCampusTipUpvote(userId: string, tipId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.campusTipUpvote.findUnique({
      where: { userId_tipId: { userId, tipId } },
    })
    if (existing) {
      await tx.campusTipUpvote.delete({ where: { userId_tipId: { userId, tipId } } })
      const tip = await tx.campusTip.update({
        where: { id: tipId },
        data: { upvoteCount: { decrement: 1 } },
      })
      return { upvoted: false, count: tip.upvoteCount }
    }
    await tx.campusTipUpvote.create({ data: { userId, tipId } })
    const tip = await tx.campusTip.update({
      where: { id: tipId },
      data: { upvoteCount: { increment: 1 } },
    })
    return { upvoted: true, count: tip.upvoteCount }
  })
}

// ── Impact (computed, no new models) ────────────────────────────────────────

export async function getStudentImpact(userId: string) {
  const [
    feedbackCount,
    collections,
    suggestions,
    campusTips,
    collectionSaveCount,
  ] = await Promise.all([
    prisma.contentFeedback.count({ where: { userId } }),
    prisma.studentCollection.findMany({
      where: { userId, isPublic: true },
      include: { _count: { select: { saves: true, items: true } } },
    }),
    prisma.improvementSuggestion.findMany({
      where: { userId },
      select: { id: true, upvoteCount: true, suggestion: true, sandyCategory: true },
    }),
    prisma.campusTip.findMany({
      where: { userId },
      select: { id: true, upvoteCount: true, content: true, tipType: true },
    }),
    prisma.collectionSave.count({
      where: { collection: { userId, isPublic: true } },
    }),
  ])

  const totalSuggestionUpvotes = suggestions.reduce((sum, s) => sum + s.upvoteCount, 0)
  const totalTipUpvotes = campusTips.reduce((sum, t) => sum + t.upvoteCount, 0)
  const totalCollectionItems = collections.reduce((sum, c) => sum + c._count.items, 0)

  return {
    feedbackGiven: feedbackCount,
    collectionsCreated: collections.length,
    collectionsSaved: collectionSaveCount,
    totalCollectionItems,
    suggestionsSubmitted: suggestions.length,
    suggestionUpvotesReceived: totalSuggestionUpvotes,
    campusTipsShared: campusTips.length,
    campusTipUpvotesReceived: totalTipUpvotes,
    topSuggestion: suggestions.sort((a, b) => b.upvoteCount - a.upvoteCount)[0] ?? null,
    topTip: campusTips.sort((a, b) => b.upvoteCount - a.upvoteCount)[0] ?? null,
    // Impact score: simple weighted sum for display
    impactScore:
      feedbackCount * 2 +
      collections.length * 5 +
      collectionSaveCount * 3 +
      suggestions.length * 3 +
      totalSuggestionUpvotes * 1 +
      campusTips.length * 3 +
      totalTipUpvotes * 1,
  }
}

// ── Sandy Context Builder ───────────────────────────────────────────────────

export async function buildContributionContext(userId: string): Promise<string | null> {
  const [feedbackCount, collectionCount, suggestionCount, tipCount] = await Promise.all([
    prisma.contentFeedback.count({ where: { userId } }),
    prisma.studentCollection.count({ where: { userId } }),
    prisma.improvementSuggestion.count({ where: { userId } }),
    prisma.campusTip.count({ where: { userId } }),
  ])

  const total = feedbackCount + collectionCount + suggestionCount + tipCount
  if (total === 0) return null

  const parts: string[] = []
  if (feedbackCount > 0) parts.push(`${feedbackCount} feedback submissions`)
  if (collectionCount > 0) parts.push(`${collectionCount} curated collections`)
  if (suggestionCount > 0) parts.push(`${suggestionCount} improvement suggestions`)
  if (tipCount > 0) parts.push(`${tipCount} campus tips`)

  return `\n\n## CONTRIBUTION ACTIVITY\nThis student has contributed: ${parts.join(', ')}. They can manage contributions at /contribute. Acknowledge their contributions when relevant.`
}
