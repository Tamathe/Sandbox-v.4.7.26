import { prisma } from '../prisma'
import { getUserGroupRole } from '../group-chat-service'

export interface ThreadSearchResult {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; avatarUrl: string | null }
}

/**
 * Search messages within a group's channels using ILIKE.
 */
export async function searchThreadMessages(
  userId: string,
  groupId: string,
  query: string,
  limit = 20,
): Promise<{ results: ThreadSearchResult[] } | { error: string; status: number }> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Not a member', status: 403 }

  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) {
    return { error: 'Query must be at least 2 characters', status: 400 }
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50)

  // Get all channel IDs for this group
  const channels = await prisma.chatChannel.findMany({
    where: { groupId },
    select: { id: true },
  })
  const channelIds = channels.map((c) => c.id)
  if (channelIds.length === 0) return { results: [] }

  const messages = await prisma.channelMessage.findMany({
    where: {
      channelId: { in: channelIds },
      deletedAt: null,
      content: { contains: trimmed, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    take: safeLimit,
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  return {
    results: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      author: m.author,
    })),
  }
}
