import { prisma } from '../prisma'
import { getUserGroupRole } from '../group-chat-service'

/**
 * Toggle mute state for a group conversation.
 * If muted → unmute (delete ChatMute record).
 * If unmuted → mute (create ChatMute record).
 * Returns the new muted state.
 */
export async function toggleGroupMute(
  userId: string,
  groupId: string,
): Promise<{ muted: boolean } | { error: string; status: number }> {
  // Verify group exists and user is a member
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } })
  if (!group) return { error: 'Group not found', status: 404 }

  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Forbidden', status: 403 }

  // Check if already muted
  const existing = await prisma.chatMute.findFirst({
    where: { userId, groupId },
  })

  if (existing) {
    // Unmute — delete the record
    await prisma.chatMute.delete({ where: { id: existing.id } })
    return { muted: false }
  }

  // Mute — create a new record (self-mute: mutedById = userId)
  await prisma.chatMute.create({
    data: {
      userId,
      mutedById: userId,
      groupId,
    },
  })
  return { muted: true }
}

/**
 * Check if a user has muted a specific group.
 */
export async function isGroupMuted(
  userId: string,
  groupId: string,
): Promise<boolean> {
  const mute = await prisma.chatMute.findFirst({
    where: { userId, groupId },
  })
  return mute !== null
}
