import { prisma } from '../prisma'

interface ConversationParams {
  userId: string
  cursor?: string | null
  limit: number
}

interface ConversationResult {
  conversations: {
    groupId: string
    name: string
    type: string
    isArchived: boolean
    isMuted: boolean
    notificationLevel: 'ALL' | 'MENTIONS' | 'NONE'
    lastMessage: {
      content: string
      createdAt: string
      authorName: string
      authorAvatar: string | null
    } | null
    unreadCount: number
    memberAvatars: { name: string; avatarUrl: string | null }[]
    memberCount: number
  }[]
  nextCursor: string | null
}

export async function getConversations(
  params: ConversationParams,
): Promise<ConversationResult> {
  const { userId, cursor, limit } = params

  // 1. Get all groups the user is a member of
  const memberships = await prisma.chatMembership.findMany({
    where: { userId },
    select: { groupId: true },
  })

  const groupIds = memberships.map((m) => m.groupId)
  if (groupIds.length === 0) {
    return { conversations: [], nextCursor: null }
  }

  // 2. Get groups with channels, memberships, and compute last message per group
  const groups = await prisma.chatGroup.findMany({
    where: { id: { in: groupIds } },
    include: {
      channels: {
        select: { id: true },
      },
      memberships: {
        orderBy: { joinedAt: 'asc' },
        take: 3,
        include: {
          user: { select: { name: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { memberships: true },
      },
    },
  })

  // 3. Get last message for each group (across all channels)
  const allChannelIds = groups.flatMap((g) => g.channels.map((c) => c.id))

  const lastMessages =
    allChannelIds.length > 0
      ? await prisma.channelMessage.findMany({
          where: {
            channelId: { in: allChannelIds },
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          distinct: ['channelId'],
          select: {
            channelId: true,
            content: true,
            createdAt: true,
            author: { select: { name: true, avatarUrl: true } },
          },
        })
      : []

  // Map channelId → groupId
  const channelToGroup = new Map<string, string>()
  for (const g of groups) {
    for (const c of g.channels) {
      channelToGroup.set(c.id, g.id)
    }
  }

  // Pick the most recent message per group
  const lastMessageByGroup = new Map<
    string,
    { content: string; createdAt: Date; authorName: string; authorAvatar: string | null }
  >()
  for (const msg of lastMessages) {
    const gId = channelToGroup.get(msg.channelId)
    if (!gId) continue
    const existing = lastMessageByGroup.get(gId)
    if (!existing || msg.createdAt > existing.createdAt) {
      lastMessageByGroup.set(gId, {
        content: msg.content,
        createdAt: msg.createdAt,
        authorName: msg.author.name,
        authorAvatar: msg.author.avatarUrl,
      })
    }
  }

  // 4. Get unread counts per group
  // Fetch user's read cursors for all channels
  const readCursors = await prisma.channelReadCursor.findMany({
    where: {
      userId,
      channelId: { in: allChannelIds },
    },
    select: { channelId: true, lastReadAt: true },
  })
  const cursorMap = new Map(readCursors.map((rc) => [rc.channelId, rc.lastReadAt]))

  // Count unread messages per group
  const unreadByGroup = new Map<string, number>()
  if (allChannelIds.length > 0) {
    // Build per-channel unread counts
    for (const g of groups) {
      let groupUnread = 0
      for (const ch of g.channels) {
        const lastRead = cursorMap.get(ch.id)
        // Count messages after the read cursor (or all messages if no cursor)
        const count = await prisma.channelMessage.count({
          where: {
            channelId: ch.id,
            deletedAt: null,
            ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
          },
        })
        groupUnread += count
      }
      unreadByGroup.set(g.id, groupUnread)
    }
  }

  // 5. Fetch muted groups for this user
  const mutes = await prisma.chatMute.findMany({
    where: { userId, groupId: { in: groupIds } },
    select: { groupId: true },
  })
  const mutedGroupIds = new Set(mutes.map((m) => m.groupId).filter(Boolean))

  // 5b. Fetch notification preferences
  const notifPrefs = await prisma.notificationPreference.findMany({
    where: { userId, groupId: { in: groupIds } },
    select: { groupId: true, level: true },
  })
  const notifByGroup = new Map(notifPrefs.map((p) => [p.groupId, p.level as 'ALL' | 'MENTIONS' | 'NONE']))

  // 6. Assemble conversations
  const conversations = groups.map((g) => {
    const lastMsg = lastMessageByGroup.get(g.id)
    return {
      groupId: g.id,
      name: g.name,
      type: g.type,
      isArchived: g.isArchived,
      isMuted: mutedGroupIds.has(g.id) || notifByGroup.get(g.id) === 'NONE',
      notificationLevel: notifByGroup.get(g.id) ?? 'ALL',
      lastMessage: lastMsg
        ? {
            content: lastMsg.content,
            createdAt: lastMsg.createdAt.toISOString(),
            authorName: lastMsg.authorName,
            authorAvatar: lastMsg.authorAvatar,
          }
        : null,
      unreadCount: unreadByGroup.get(g.id) ?? 0,
      memberAvatars: g.memberships.map((m) => ({
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
      })),
      memberCount: g._count.memberships,
      _sortKey: lastMsg?.createdAt ?? new Date(0),
    }
  })

  // 7. Sort by last message desc (no message = last)
  conversations.sort((a, b) => b._sortKey.getTime() - a._sortKey.getTime())

  // 8. Apply cursor pagination
  let filtered = conversations
  if (cursor) {
    const cursorDate = new Date(cursor)
    filtered = conversations.filter((c) => c._sortKey < cursorDate)
  }

  const page = filtered.slice(0, limit)
  const nextCursor =
    page.length === limit && page.length > 0
      ? page[page.length - 1].lastMessage?.createdAt ?? null
      : null

  // Strip internal _sortKey
  return {
    conversations: page.map(({ _sortKey, ...rest }) => rest),
    nextCursor,
  }
}
