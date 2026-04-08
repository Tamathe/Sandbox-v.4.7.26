/**
 * Sandy Messages Context — provides unread thread counts, group activity,
 * and recent message previews for Sandy's system prompt when the user
 * is on /messages or /messages/[groupId].
 */

import { prisma } from '../prisma'

export interface MessagesContextData {
  totalUnread: number
  groups: {
    groupId: string
    name: string
    type: string
    unreadCount: number
    lastMessagePreview: string | null
    lastMessageAuthor: string | null
    memberCount: number
  }[]
  activeGroupId: string | null
}

/**
 * Fetch the user's messaging state — unread counts, group summaries,
 * and the active group if they're viewing a specific thread.
 * Returns null if the user is not on a /messages page.
 */
export async function getMessagesContext(
  userId: string,
  currentPage: string,
): Promise<MessagesContextData | null> {
  if (!currentPage.startsWith('/messages')) return null

  const activeGroupId = currentPage.startsWith('/messages/')
    ? currentPage.split('/')[2] || null
    : null

  // Get user's group memberships
  const memberships = await prisma.chatMembership.findMany({
    where: { userId },
    select: { groupId: true },
  })
  const groupIds = memberships.map(m => m.groupId)
  if (groupIds.length === 0) {
    return { totalUnread: 0, groups: [], activeGroupId }
  }

  // Fetch groups with channels + member counts
  const groups = await prisma.chatGroup.findMany({
    where: { id: { in: groupIds }, isArchived: false },
    select: {
      id: true,
      name: true,
      type: true,
      channels: { select: { id: true } },
      _count: { select: { memberships: true } },
    },
  })

  const allChannelIds = groups.flatMap(g => g.channels.map(c => c.id))
  if (allChannelIds.length === 0) {
    return { totalUnread: 0, groups: [], activeGroupId }
  }

  // Fetch read cursors + last messages in parallel
  const [readCursors, lastMessages] = await Promise.all([
    prisma.channelReadCursor.findMany({
      where: { userId, channelId: { in: allChannelIds } },
      select: { channelId: true, lastReadAt: true },
    }),
    prisma.channelMessage.findMany({
      where: { channelId: { in: allChannelIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      distinct: ['channelId'],
      select: {
        channelId: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
  ])

  const cursorMap = new Map(readCursors.map(rc => [rc.channelId, rc.lastReadAt]))

  // Map channelId → groupId
  const channelToGroup = new Map<string, string>()
  for (const g of groups) {
    for (const c of g.channels) channelToGroup.set(c.id, g.id)
  }

  // Compute last message per group
  const lastMsgByGroup = new Map<
    string,
    { content: string; authorName: string; createdAt: Date }
  >()
  for (const msg of lastMessages) {
    const gId = channelToGroup.get(msg.channelId)
    if (!gId) continue
    const existing = lastMsgByGroup.get(gId)
    if (!existing || msg.createdAt > existing.createdAt) {
      lastMsgByGroup.set(gId, {
        content: msg.content,
        authorName: msg.author.name,
        createdAt: msg.createdAt,
      })
    }
  }

  // Compute unread per group
  const unreadByGroup = new Map<string, number>()
  for (const g of groups) {
    let groupUnread = 0
    for (const ch of g.channels) {
      const lastRead = cursorMap.get(ch.id)
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

  const totalUnread = Array.from(unreadByGroup.values()).reduce((a, b) => a + b, 0)

  // Sort by unread desc, take top 8
  const sortedGroups = groups
    .map(g => ({
      groupId: g.id,
      name: g.name,
      type: g.type,
      unreadCount: unreadByGroup.get(g.id) ?? 0,
      lastMessagePreview: lastMsgByGroup.get(g.id)?.content.slice(0, 80) ?? null,
      lastMessageAuthor: lastMsgByGroup.get(g.id)?.authorName ?? null,
      memberCount: g._count.memberships,
    }))
    .sort((a, b) => b.unreadCount - a.unreadCount)
    .slice(0, 8)

  return { totalUnread, groups: sortedGroups, activeGroupId }
}

/**
 * Build the `## MESSAGES CONTEXT` system prompt section from fetched data.
 */
export function buildMessagesContextSection(data: MessagesContextData): string {
  if (data.groups.length === 0 && data.totalUnread === 0) return ''

  const lines: string[] = [`Total unread messages: ${data.totalUnread}`]

  if (data.groups.length > 0) {
    const unreadGroups = data.groups.filter(g => g.unreadCount > 0)
    if (unreadGroups.length > 0) {
      lines.push('\nUnread threads:')
      for (const g of unreadGroups) {
        const preview =
          g.lastMessagePreview
            ? ` — last: "${g.lastMessagePreview}" (${g.lastMessageAuthor})`
            : ''
        lines.push(
          `- **${g.name}** (${g.type.toLowerCase()}, ${g.memberCount} members): ${g.unreadCount} unread${preview}`,
        )
      }
    }

    const activeGroup = data.activeGroupId
      ? data.groups.find(g => g.groupId === data.activeGroupId)
      : null
    if (activeGroup) {
      lines.push(
        `\nCurrently viewing: **${activeGroup.name}** (${activeGroup.type.toLowerCase()}, ${activeGroup.memberCount} members)`,
      )
    }
  }

  return `\n\n## MESSAGES CONTEXT
${lines.join('\n')}

Your role here:
- Help the user catch up on unread threads — summarize what they missed
- Suggest which thread to read first based on unread count and recency
- Help compose replies or start new conversations
- Remind them about slash commands: /challenge, /study, /watch, /teachback for The Commons
- If they ask "what did I miss?", summarize the most active threads`
}
