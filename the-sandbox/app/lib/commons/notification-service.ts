/**
 * Commons Notification Service — Alerts group members when sessions start.
 *
 * When a Commons session is created/started, notifies all group members (except creator)
 * so they can join. Uses the existing Notification model + createNotification.
 */

import { prisma } from '../prisma'
import { createNotification } from '../notifications'

const ROOM_TYPE_LABELS: Record<string, string> = {
  CHALLENGE: 'Challenge',
  STUDY: 'Study Session',
  WATCH: 'Watch Party',
  TEACHBACK: 'Teach-Back',
  SIMULATION: 'Simulation',
  DEBATE: 'Debate',
  PROBLEM_LAB: 'Problem Lab',
  SPEED_MENTORING: 'Speed Mentoring',
  PEER_REVIEW: 'Peer Review',
  OFFICE_HOURS: 'Office Hours',
  CASE_STUDY: 'Case Study',
  IMPROV: 'Improv',
  FISHBOWL: 'Fishbowl',
}

/**
 * Notify all group members when a Commons session is created.
 * Fire-and-forget — errors are logged, not thrown.
 */
export async function notifyGroupOfLiveRoom(
  roomId: string,
  channelId: string,
  creatorId: string,
  roomType: string,
  title: string,
): Promise<void> {
  try {
    // Find the group and its members
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            memberships: {
              where: { userId: { not: creatorId } },
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!channel?.group) return

    const typeLabel = ROOM_TYPE_LABELS[roomType] ?? 'Commons session'
    const memberIds = channel.group.memberships.map((m) => m.userId)

    // Create notifications for all group members (except creator)
    await Promise.all(
      memberIds.map((userId) =>
        createNotification({
          userId,
          type: 'LIVE_ROOM_STARTED',
          title: `${typeLabel} started in ${channel.group!.name}`,
          body: `"${title}" — tap to join!`,
          href: `/messages/${channel.group!.id}`,
        }),
      ),
    )
  } catch (err) {
    console.error('[LiveRoomNotifications] Error notifying group:', err)
  }
}
