import { prisma } from '../prisma'
import { getGroupGeneralChannel } from './thread-service'
import type { ServiceResult } from '../types'

/**
 * Upsert the ChannelReadCursor for a user + channel to the latest message time.
 * Called when the user opens/views a thread.
 */
export async function markThreadAsRead(
  userId: string,
  groupId: string,
): Promise<ServiceResult> {
  // Verify membership and get general channel
  const channelResult = await getGroupGeneralChannel(userId, groupId)
  if ('error' in channelResult) return channelResult

  const { channelId } = channelResult

  // Find the latest message in the channel
  const latestMessage = await prisma.channelMessage.findFirst({
    where: { channelId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  if (!latestMessage) {
    // No messages — nothing to mark as read
    return { success: true }
  }

  // Upsert the read cursor
  await prisma.channelReadCursor.upsert({
    where: { userId_channelId: { userId, channelId } },
    update: { lastReadAt: latestMessage.createdAt },
    create: { userId, channelId, lastReadAt: latestMessage.createdAt },
  })

  return { success: true }
}
