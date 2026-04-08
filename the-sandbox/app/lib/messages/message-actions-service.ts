import { prisma } from '../prisma'
import { getUserGroupRole } from '../group-chat-service'
import type { ServiceResult } from '../types'

/**
 * Edit a message. Only the author can edit.
 */
export async function editMessage(
  userId: string,
  messageId: string,
  newContent: string,
): Promise<ServiceResult> {
  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    select: { authorId: true, deletedAt: true },
  })

  if (!message) return { error: 'Message not found', status: 404 }
  if (message.deletedAt) return { error: 'Cannot edit a deleted message', status: 400 }
  if (message.authorId !== userId) return { error: 'Forbidden', status: 403 }

  const trimmed = newContent.trim()
  if (!trimmed || trimmed.length > 4000) {
    return { error: 'Content must be 1–4000 characters', status: 400 }
  }

  await prisma.channelMessage.update({
    where: { id: messageId },
    data: { content: trimmed, editedAt: new Date() },
  })

  return { success: true }
}

/**
 * Soft-delete a message. Author or group OWNER/MODERATOR can delete.
 */
export async function deleteMessage(
  userId: string,
  messageId: string,
): Promise<ServiceResult> {
  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    select: { authorId: true, deletedAt: true, channel: { select: { groupId: true } } },
  })

  if (!message) return { error: 'Message not found', status: 404 }
  if (message.deletedAt) return { error: 'Message already deleted', status: 400 }

  // Author can always delete their own message
  if (message.authorId !== userId) {
    // Check if user is OWNER or MODERATOR
    const role = await getUserGroupRole(userId, message.channel.groupId)
    if (role !== 'OWNER' && role !== 'MODERATOR') {
      return { error: 'Forbidden', status: 403 }
    }
  }

  await prisma.channelMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  })

  return { success: true }
}
