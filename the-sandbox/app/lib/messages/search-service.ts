import { prisma } from '../prisma'

interface SearchParams {
  userId: string
  q: string
  cursor?: string | null
  limit: number
  groupId?: string | null
}

interface SearchResult {
  messages: {
    id: string
    content: string
    createdAt: string
    author: { name: string; avatarUrl: string | null }
    group: { id: string; name: string; type: string }
    channel: { id: string; name: string }
  }[]
  nextCursor: string | null
}

export async function searchMessages(params: SearchParams): Promise<SearchResult> {
  const { userId, q, cursor, limit, groupId } = params

  // 1. Get groups the user is a member of
  const memberships = await prisma.chatMembership.findMany({
    where: { userId },
    select: { groupId: true },
  })

  let memberGroupIds = memberships.map((m) => m.groupId)
  if (memberGroupIds.length === 0) {
    return { messages: [], nextCursor: null }
  }

  // If groupId filter specified, restrict to that group (only if user is a member)
  if (groupId) {
    if (!memberGroupIds.includes(groupId)) {
      return { messages: [], nextCursor: null }
    }
    memberGroupIds = [groupId]
  }

  // 2. Search messages
  const messages = await prisma.channelMessage.findMany({
    where: {
      channel: {
        groupId: { in: memberGroupIds },
      },
      content: { contains: q, mode: 'insensitive' },
      deletedAt: null,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { name: true, avatarUrl: true } },
      channel: {
        select: {
          id: true,
          name: true,
          group: {
            select: { id: true, name: true, type: true },
          },
        },
      },
    },
  })

  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return {
    messages: page.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      author: { name: m.author.name, avatarUrl: m.author.avatarUrl },
      group: { id: m.channel.group.id, name: m.channel.group.name, type: m.channel.group.type },
      channel: { id: m.channel.id, name: m.channel.name },
    })),
    nextCursor,
  }
}
