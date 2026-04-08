import { prisma } from '../prisma'

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

/**
 * Toggle a reaction on a message. If the user already reacted with that emoji,
 * remove it; otherwise, add it. Returns the updated reaction summary.
 */
export async function toggleReaction(
  userId: string,
  messageId: string,
  emoji: string,
): Promise<{ toggled: 'added' | 'removed' } | { error: string; status: number }> {
  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return { error: `Invalid emoji. Allowed: ${ALLOWED_EMOJIS.join(' ')}`, status: 400 }
  }

  // Verify message exists
  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    select: { id: true, deletedAt: true },
  })
  if (!message) {
    return { error: 'Message not found', status: 404 }
  }
  if (message.deletedAt) {
    return { error: 'Cannot react to deleted messages', status: 400 }
  }

  // Check if reaction already exists
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  })

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } })
    return { toggled: 'removed' }
  } else {
    await prisma.messageReaction.create({
      data: { messageId, userId, emoji },
    })
    return { toggled: 'added' }
  }
}

/**
 * Get aggregated reactions for a set of message IDs.
 * Returns a map: messageId → [{ emoji, count, reacted }]
 */
export async function getReactionsForMessages(
  messageIds: string[],
  currentUserId: string,
): Promise<Map<string, { emoji: string; count: number; reacted: boolean }[]>> {
  if (messageIds.length === 0) return new Map()

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId: { in: messageIds } },
    select: { messageId: true, userId: true, emoji: true },
  })

  // Group by messageId → emoji → { count, reacted }
  const grouped = new Map<string, Map<string, { count: number; reacted: boolean }>>()

  for (const r of reactions) {
    if (!grouped.has(r.messageId)) {
      grouped.set(r.messageId, new Map())
    }
    const emojiMap = grouped.get(r.messageId)!
    if (!emojiMap.has(r.emoji)) {
      emojiMap.set(r.emoji, { count: 0, reacted: false })
    }
    const entry = emojiMap.get(r.emoji)!
    entry.count++
    if (r.userId === currentUserId) entry.reacted = true
  }

  // Convert to the output format
  const result = new Map<string, { emoji: string; count: number; reacted: boolean }[]>()
  for (const [msgId, emojiMap] of grouped) {
    result.set(
      msgId,
      Array.from(emojiMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        reacted: data.reacted,
      })),
    )
  }

  return result
}
