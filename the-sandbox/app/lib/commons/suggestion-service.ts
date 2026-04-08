/**
 * Commons Suggestion Service — Sandy's social catalyst brain.
 *
 * Checks contextual signals to determine when to suggest a Commons session:
 * - Exam proximity: course has an assignment due within 48 hours
 * - Group activity: multiple people in a chat group are currently active
 * - Study patterns: user has been in a study group chat for a while
 * - Recent challenge: "rematch" suggestion after a completed game
 *
 * Returns suggestion objects that can be rendered as Sandy chips or messages.
 */

import { prisma } from '../prisma'

export type { LiveRoomSuggestion } from './types'
import type { LiveRoomSuggestion } from './types'

/**
 * Get Commons suggestions for a user based on their current context.
 * Called from the concierge API to inject into Sandy's system prompt.
 */
export async function getSuggestionsForUser(userId: string): Promise<LiveRoomSuggestion[]> {
  const suggestions: LiveRoomSuggestion[] = []

  // 1. Check for upcoming assignments (exam prep signal)
  const upcomingAssignments = await getUpcomingAssignments(userId)
  for (const assignment of upcomingAssignments.slice(0, 1)) {
    // Find if there's a course chat group
    const courseGroup = await prisma.chatGroup.findFirst({
      where: { courseId: assignment.courseId, isArchived: false },
      include: { channels: { where: { type: 'GENERAL' }, take: 1 } },
    })
    if (courseGroup && courseGroup.channels.length > 0) {
      suggestions.push({
        type: 'exam_prep',
        message: `You have "${assignment.title}" due ${formatDueDate(assignment.dueDate)} in ${assignment.courseCode}. Want me to start a Challenge for your study group?`,
        chipLabel: `Challenge: ${assignment.courseCode}`,
        channelId: courseGroup.channels[0]!.id,
        groupName: courseGroup.name,
        topic: `${assignment.courseCode} — ${assignment.title}`,
        courseId: assignment.courseId,
      })
    }
  }

  // 2. Check for recent completed challenges (rematch signal)
  const recentChallenge = await getRecentCompletedChallenge(userId)
  if (recentChallenge) {
    suggestions.push({
      type: 'rematch',
      message: `You played "${recentChallenge.title}" earlier. The other players might be up for a rematch!`,
      chipLabel: `Rematch: ${recentChallenge.title}`,
      channelId: recentChallenge.channelId,
      groupName: recentChallenge.groupName,
      topic: recentChallenge.topic,
    })
  }

  // 3. Check for active study groups (group activity signal)
  const activeGroups = await getActiveStudyGroups(userId)
  for (const group of activeGroups.slice(0, 1)) {
    // Don't suggest if there's already an active session
    const activeRoom = await prisma.liveRoom.findFirst({
      where: { channelId: group.channelId, phase: { not: 'COMPLETE' } },
    })
    if (!activeRoom) {
      suggestions.push({
        type: 'group_active',
        message: `${group.activeCount} people in "${group.groupName}" have been chatting. Perfect time for a Challenge!`,
        chipLabel: `Challenge ${group.groupName}`,
        channelId: group.channelId,
        groupName: group.groupName,
      })
    }
  }

  return suggestions
}

/**
 * Get a formatted summary of suggestions for Sandy's system prompt injection.
 */
export async function getSuggestionContext(userId: string): Promise<string> {
  const suggestions = await getSuggestionsForUser(userId)
  if (suggestions.length === 0) return ''

  const lines = suggestions.map((s) => {
    switch (s.type) {
      case 'exam_prep':
        return `[EXAM_PREP] ${s.message} (channel: ${s.channelId}, topic: ${s.topic})`
      case 'rematch':
        return `[REMATCH] ${s.message} (channel: ${s.channelId}, topic: ${s.topic})`
      case 'group_active':
        return `[GROUP_ACTIVE] ${s.message} (channel: ${s.channelId})`
      default:
        return `[SUGGESTION] ${s.message}`
    }
  })

  return `\n\n--- LIVE ROOM SUGGESTIONS ---\nYou can proactively suggest these community experiences to the user. Mention them naturally in conversation — don't list them all at once. Use the chip format <!--CHIPS:["chipLabel"]-->\n${lines.join('\n')}`
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface UpcomingAssignment {
  courseId: string
  courseCode: string
  title: string
  dueDate: Date
}

async function getUpcomingAssignments(userId: string): Promise<UpcomingAssignment[]> {
  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Get courses the user is enrolled in (field is studentId, not userId)
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: { courseId: true },
  })
  const courseIds = enrollments.map((e) => e.courseId)

  if (courseIds.length === 0) return []

  const assignments = await prisma.assignment.findMany({
    where: {
      courseId: { in: courseIds },
      dueAt: { gte: now, lte: twoDaysFromNow },
    },
    include: { course: { select: { id: true, courseCode: true } } },
    orderBy: { dueAt: 'asc' },
    take: 3,
  })

  return assignments
    .filter((a) => a.dueAt !== null)
    .map((a) => ({
      courseId: a.course.id,
      courseCode: a.course.courseCode,
      title: a.title,
      dueDate: a.dueAt!,
    }))
}

async function getRecentCompletedChallenge(userId: string) {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)

  const participant = await prisma.liveRoomParticipant.findFirst({
    where: {
      userId,
      room: {
        phase: 'COMPLETE',
        endedAt: { gte: sixHoursAgo },
      },
    },
    include: {
      room: {
        include: {
          channel: {
            include: { group: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { room: { endedAt: 'desc' } },
  })

  if (!participant) return null

  const config = participant.room.config as Record<string, unknown>
  return {
    title: participant.room.title,
    channelId: participant.room.channelId,
    groupName: participant.room.channel.group.name,
    topic: (config.topic as string) ?? participant.room.title,
  }
}

async function getActiveStudyGroups(userId: string) {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)

  // Find groups where multiple people sent messages recently
  const memberships = await prisma.chatMembership.findMany({
    where: { userId },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          type: true,
          channels: { where: { type: 'GENERAL' }, take: 1, select: { id: true } },
        },
      },
    },
  })

  const results: Array<{ channelId: string; groupName: string; activeCount: number }> = []

  for (const m of memberships) {
    if (m.group.channels.length === 0) continue
    const channelId = m.group.channels[0]!.id

    // Count distinct authors in last 30 min
    const recentMessages = await prisma.channelMessage.findMany({
      where: {
        channelId,
        createdAt: { gte: thirtyMinAgo },
        isSandy: false,
        messageType: 'text',
      },
      select: { authorId: true },
      distinct: ['authorId'],
    })

    if (recentMessages.length >= 3) {
      results.push({
        channelId,
        groupName: m.group.name,
        activeCount: recentMessages.length,
      })
    }
  }

  return results.sort((a, b) => b.activeCount - a.activeCount)
}

function formatDueDate(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return 'very soon'
  if (diffHours < 24) return `in ${diffHours} hours`
  if (diffHours < 48) return 'tomorrow'
  return `in ${Math.ceil(diffHours / 24)} days`
}
