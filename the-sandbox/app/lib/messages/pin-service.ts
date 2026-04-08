import { prisma } from '../prisma'
import { getUserGroupRole } from '../group-chat-service'

export interface PinnedMessage {
  id: string
  content: string
  createdAt: string
  pinnedAt: string
  pinnedBy: { id: string; name: string } | null
  author: { id: string; name: string; avatarUrl: string | null }
}

/**
 * Toggle pin state on a message. Only OWNER/MODERATOR or the message author can pin/unpin.
 */
export async function togglePin(
  userId: string,
  groupId: string,
  messageId: string,
): Promise<{ pinned: boolean } | { error: string; status: number }> {
  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      authorId: true,
      deletedAt: true,
      pinnedAt: true,
      channel: { select: { groupId: true } },
    },
  })

  if (!message) return { error: 'Message not found', status: 404 }
  if (message.deletedAt) return { error: 'Cannot pin a deleted message', status: 400 }
  if (message.channel.groupId !== groupId) return { error: 'Message not in this group', status: 400 }

  // Check authorization: author or OWNER/MODERATOR
  if (message.authorId !== userId) {
    const role = await getUserGroupRole(userId, groupId)
    if (role !== 'OWNER' && role !== 'MODERATOR') {
      return { error: 'Forbidden', status: 403 }
    }
  }

  if (message.pinnedAt) {
    // Unpin
    await prisma.channelMessage.update({
      where: { id: messageId },
      data: { pinnedAt: null, pinnedById: null },
    })
    return { pinned: false }
  }

  // Pin
  await prisma.channelMessage.update({
    where: { id: messageId },
    data: { pinnedAt: new Date(), pinnedById: userId },
  })
  return { pinned: true }
}

/**
 * Get all pinned messages for a group's general channel, ordered by pinnedAt desc.
 */
export async function getPinnedMessages(
  userId: string,
  groupId: string,
): Promise<PinnedMessage[] | { error: string; status: number }> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Forbidden', status: 403 }

  // Find the general channel
  const channel = await prisma.chatChannel.findFirst({
    where: { groupId, type: 'GENERAL' },
    select: { id: true },
  })
  if (!channel) {
    const fallback = await prisma.chatChannel.findFirst({
      where: { groupId },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    if (!fallback) return { error: 'No channels in group', status: 404 }
    return fetchPinnedForChannel(fallback.id)
  }
  return fetchPinnedForChannel(channel.id)
}

async function fetchPinnedForChannel(channelId: string): Promise<PinnedMessage[]> {
  const rows = await prisma.channelMessage.findMany({
    where: {
      channelId,
      pinnedAt: { not: null },
      deletedAt: null,
    },
    orderBy: { pinnedAt: 'desc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      pinnedAt: true,
      pinnedBy: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  return rows.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    pinnedAt: m.pinnedAt!.toISOString(),
    pinnedBy: m.pinnedBy,
    author: m.author,
  }))
}
