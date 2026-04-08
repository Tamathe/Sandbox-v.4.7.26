import { prisma } from '../prisma'
import { getGroupGeneralChannel } from './thread-service'

const TYPING_ACTIVE_SECONDS = 5
const TYPING_STALE_SECONDS = 10

/**
 * Report that a user is currently typing in a group's general channel.
 * Upserts a TypingIndicator record with updatedAt = now().
 */
export async function reportTyping(
  userId: string,
  groupId: string,
): Promise<{ ok: true } | { error: string; status: number }> {
  const channelResult = await getGroupGeneralChannel(userId, groupId)
  if ('error' in channelResult) return channelResult

  const { channelId } = channelResult

  await prisma.typingIndicator.upsert({
    where: { userId_channelId: { userId, channelId } },
    update: { updatedAt: new Date() },
    create: { userId, channelId },
  })

  return { ok: true }
}

/**
 * Fetch users currently typing in a group (updatedAt within last 5s),
 * excluding the requesting user. Also cleans up stale records (>10s).
 */
export async function getTypingUsers(
  userId: string,
  groupId: string,
): Promise<{ typing: { id: string; name: string }[] } | { error: string; status: number }> {
  const channelResult = await getGroupGeneralChannel(userId, groupId)
  if ('error' in channelResult) return channelResult

  const { channelId } = channelResult
  const now = new Date()

  // Clean up stale records older than 10s
  const staleThreshold = new Date(now.getTime() - TYPING_STALE_SECONDS * 1000)
  await prisma.typingIndicator.deleteMany({
    where: { channelId, updatedAt: { lt: staleThreshold } },
  })

  // Fetch active typers (within last 5s), excluding requesting user
  const activeThreshold = new Date(now.getTime() - TYPING_ACTIVE_SECONDS * 1000)
  const indicators = await prisma.typingIndicator.findMany({
    where: {
      channelId,
      updatedAt: { gte: activeThreshold },
      userId: { not: userId },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  return {
    typing: indicators.map((i) => ({ id: i.user.id, name: i.user.name })),
  }
}

/**
 * Clear a user's typing indicator (e.g., after sending a message).
 */
export async function clearTyping(
  userId: string,
  channelId: string,
): Promise<void> {
  await prisma.typingIndicator.deleteMany({
    where: { userId, channelId },
  })
}
