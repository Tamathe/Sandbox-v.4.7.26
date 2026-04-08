import { prisma } from '../prisma'
import { getUserGroupRole } from '../group-chat-service'
import { getReactionsForMessages } from './reaction-service'

export interface ReactionSummary {
  emoji: string
  count: number
  reacted: boolean
}

export interface ThreadMessage {
  id: string
  channelId: string
  authorId: string
  content: string
  messageType: string
  isSandy: boolean
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  attachmentUrl: string | null
  attachmentName: string | null
  attachmentType: string | null
  liveRoomId: string | null
  liveRoom: {
    id: string
    type: string
    title: string
    phase: string
    hostId: string
    currentRound: number
    config: Record<string, unknown>
    participants: Array<{ userId: string; name: string; score: number; streak: number }>
  } | null
  replyToId: string | null
  replyTo: {
    id: string
    content: string
    author: { id: string; name: string }
  } | null
  author: { id: string; name: string; avatarUrl: string | null }
  reactions: ReactionSummary[]
  pinnedAt: string | null
  pinnedById: string | null
}

export interface ThreadInfo {
  groupId: string
  groupName: string
  channelId: string
  members: { id: string; name: string; avatarUrl: string | null }[]
}

/**
 * Get the GENERAL channel for a group, verifying the user is a member.
 */
export async function getGroupGeneralChannel(
  userId: string,
  groupId: string,
): Promise<{ channelId: string } | { error: string; status: number }> {
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } })
  if (!group || group.isArchived) {
    return { error: 'Not found', status: 404 }
  }

  const role = await getUserGroupRole(userId, groupId)
  if (role === null) {
    return { error: 'Forbidden', status: 403 }
  }

  const channel = await prisma.chatChannel.findFirst({
    where: { groupId, type: 'GENERAL' },
    select: { id: true },
  })

  if (!channel) {
    // Fallback: use the first channel by position
    const fallback = await prisma.chatChannel.findFirst({
      where: { groupId },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    if (!fallback) return { error: 'No channels in group', status: 404 }
    return { channelId: fallback.id }
  }

  return { channelId: channel.id }
}

/**
 * Fetch group info (name, members) for the thread header.
 */
export async function getThreadInfo(
  userId: string,
  groupId: string,
): Promise<ThreadInfo | { error: string; status: number }> {
  const group = await prisma.chatGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, isArchived: true },
  })
  if (!group || group.isArchived) {
    return { error: 'Not found', status: 404 }
  }

  const role = await getUserGroupRole(userId, groupId)
  if (role === null) {
    return { error: 'Forbidden', status: 403 }
  }

  const channelResult = await getGroupGeneralChannel(userId, groupId)
  if ('error' in channelResult) return channelResult

  const memberships = await prisma.chatMembership.findMany({
    where: { groupId },
    select: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  return {
    groupId: group.id,
    groupName: group.name,
    channelId: channelResult.channelId,
    members: memberships.map((m) => m.user),
  }
}

/**
 * Fetch messages for a channel with replyTo info, using cursor-based pagination.
 */
export async function getThreadMessages(
  channelId: string,
  options: { limit?: number; after?: string },
  userId?: string,
): Promise<ThreadMessage[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)

  const where: Record<string, unknown> = { channelId }

  if (options.after) {
    const afterDate = new Date(options.after)
    where.createdAt = { gt: afterDate }
  }

  const rows = await prisma.channelMessage.findMany({
    where,
    orderBy: { createdAt: options.after ? 'asc' : 'desc' },
    take: limit,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          author: { select: { id: true, name: true } },
        },
      },
      liveRoom: {
        select: {
          id: true,
          type: true,
          title: true,
          phase: true,
          hostId: true,
          currentRound: true,
          config: true,
          participants: {
            select: {
              userId: true,
              score: true,
              streak: true,
              user: { select: { name: true } },
            },
            orderBy: { score: 'desc' },
          },
        },
      },
    },
  })

  // When fetching latest (no `after`), we queried desc and need to reverse
  if (!options.after) rows.reverse()

  // Fetch reactions for all messages in batch
  const messageIds = rows.map((m) => m.id)
  const reactionsMap = userId
    ? await getReactionsForMessages(messageIds, userId)
    : new Map()

  return rows.map((m) => ({
    id: m.id,
    channelId: m.channelId,
    authorId: m.authorId,
    content: m.deletedAt ? '[deleted]' : m.content,
    messageType: m.messageType,
    isSandy: m.isSandy,
    editedAt: m.editedAt?.toISOString() ?? null,
    deletedAt: m.deletedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    attachmentUrl: m.deletedAt ? null : m.attachmentUrl,
    attachmentName: m.deletedAt ? null : m.attachmentName,
    attachmentType: m.deletedAt ? null : m.attachmentType,
    liveRoomId: m.liveRoomId,
    liveRoom: m.liveRoom
      ? {
          id: m.liveRoom.id,
          type: m.liveRoom.type,
          title: m.liveRoom.title,
          phase: m.liveRoom.phase,
          hostId: m.liveRoom.hostId,
          currentRound: m.liveRoom.currentRound,
          config: m.liveRoom.config as Record<string, unknown>,
          participants: m.liveRoom.participants.map((p) => ({
            userId: p.userId,
            name: p.user.name,
            score: p.score,
            streak: p.streak,
          })),
        }
      : null,
    replyToId: m.replyToId,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          author: m.replyTo.author,
        }
      : null,
    author: m.author,
    reactions: reactionsMap.get(m.id) ?? [],
    pinnedAt: m.pinnedAt?.toISOString() ?? null,
    pinnedById: m.pinnedById ?? null,
  }))
}

/**
 * Send a message to a channel, optionally as a reply.
 */
export async function sendThreadMessage(
  userId: string,
  channelId: string,
  content: string,
  replyToId?: string | null,
  attachment?: { url: string; name: string; type: string } | null,
): Promise<ThreadMessage | { error: string; status: number }> {
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, groupId: true },
  })
  if (!channel) return { error: 'Channel not found', status: 404 }

  const role = await getUserGroupRole(userId, channel.groupId)
  if (role === null) return { error: 'Forbidden', status: 403 }

  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 4000) {
    return { error: 'Content must be 1–4000 characters', status: 400 }
  }

  // Validate replyToId if provided
  if (replyToId) {
    const parent = await prisma.channelMessage.findUnique({
      where: { id: replyToId },
      select: { channelId: true },
    })
    if (!parent || parent.channelId !== channelId) {
      return { error: 'Reply target not found in this channel', status: 400 }
    }
  }

  const message = await prisma.channelMessage.create({
    data: {
      channelId,
      authorId: userId,
      content: trimmed,
      replyToId: replyToId ?? null,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentType: attachment?.type ?? null,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
  })

  return {
    id: message.id,
    channelId: message.channelId,
    authorId: message.authorId,
    content: message.content,
    messageType: message.messageType,
    isSandy: message.isSandy,
    editedAt: message.editedAt?.toISOString() ?? null,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    attachmentUrl: message.attachmentUrl,
    attachmentName: message.attachmentName,
    attachmentType: message.attachmentType,
    liveRoomId: message.liveRoomId,
    liveRoom: null,
    replyToId: message.replyToId,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          author: message.replyTo.author,
        }
      : null,
    author: message.author,
    reactions: [],
    pinnedAt: null,
    pinnedById: null,
  }
}
