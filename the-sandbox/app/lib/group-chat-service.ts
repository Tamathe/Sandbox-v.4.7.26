import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { redis } from './redis'
import type { ChatGroup, ChatMemberRole, ChannelMessage } from '../generated/prisma'

// ── Crisis detection ────────────────────────────────────────────────────────

const HIGH_SEVERITY_KEYWORDS = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  "don't want to live",
  'dont want to live',
  'self-harm',
  'self harm',
  'hurt myself',
  'want to die',
]

const MEDIUM_SEVERITY_KEYWORDS = [
  'assault',
  'unsafe',
  'threatened',
  'afraid for my safety',
  'being followed',
  'domestic violence',
]

export function detectCrisisInMessage(
  content: string,
): { crisisFlag: boolean; crisisSeverity: string | null } {
  const lower = content.toLowerCase()
  if (HIGH_SEVERITY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { crisisFlag: true, crisisSeverity: 'high' }
  }
  if (MEDIUM_SEVERITY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { crisisFlag: true, crisisSeverity: 'medium' }
  }
  return { crisisFlag: false, crisisSeverity: null }
}

// ── Redis channel stream publish ────────────────────────────────────────────

export function publishToChannelStream(
  channelId: string,
  message: ChannelMessage,
): void {
  if (!redis) return
  const key = `channel:${channelId}:messages`
  redis
    .xadd(key, '*', { event: JSON.stringify({ type: 'new_message', message }) })
    .then(() => redis!.expire(key, 86400))
    .catch((err: unknown) => console.error('[ChatBus] publish error:', err))
}

// ── Sandy AI reply ──────────────────────────────────────────────────────────

export async function generateSandyReply(
  channelId: string,
  groupId: string,
  userMessage: string,
): Promise<void> {
  try {
    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: { course: { select: { title: true, courseCode: true } } },
    })
    if (!group) return

    // Last 10 non-Sandy, non-deleted messages for context
    const recentMessages = await prisma.channelMessage.findMany({
      where: { channelId, isSandy: false, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { author: { select: { name: true } } },
    })
    recentMessages.reverse()

    let systemPrompt: string
    if (group.course) {
      systemPrompt =
        `You are Sandy, an AI teaching assistant for ${group.course.title} (${group.course.courseCode}). ` +
        `Help students understand course concepts, answer questions about the material, and guide them toward mastery. ` +
        `Be encouraging, clear, and pedagogical. Keep responses concise (2–4 sentences) for chat format. ` +
        `Never complete assignments for students — scaffold instead.`
    } else {
      systemPrompt =
        `You are Sandy, an AI academic assistant for University of Kentucky students. ` +
        `Help students with academic questions, study strategies, and campus resources. ` +
        `Be encouraging, clear, and concise. Keep responses to 2–4 sentences for chat format.`
    }

    // Build a single user turn that includes recent context + current message
    const contextLines = recentMessages
      .map((m) => `${m.author.name}: ${m.content}`)
      .join('\n')
    const fullUserTurn = contextLines ? `${contextLines}\n${userMessage}` : userMessage

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: fullUserTurn }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    if (!text) return

    const { crisisFlag, crisisSeverity } = detectCrisisInMessage(text)
    const sandyMessage = await prisma.channelMessage.create({
      data: {
        channelId,
        authorId: group.createdById,
        content: text,
        isSandy: true,
        crisisFlag,
        crisisSeverity,
      },
    })

    publishToChannelStream(channelId, sandyMessage)
  } catch (err) {
    console.error('[Sandy] reply generation error:', err)
  }
}

/**
 * Returns true if the given user is currently muted in the specified
 * channel or group (non-expired mute record exists).
 */
export async function isUserMuted(
  userId: string,
  channelId: string,
  groupId: string,
): Promise<boolean> {
  const now = new Date()
  const mute = await prisma.chatMute.findFirst({
    where: {
      userId,
      AND: [
        { OR: [{ channelId }, { groupId }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
  })
  return mute !== null
}

/**
 * Returns the current user's ChatMemberRole in the given group,
 * or null if the user has no membership.
 */
export async function getUserGroupRole(
  userId: string,
  groupId: string,
): Promise<ChatMemberRole | null> {
  const membership = await prisma.chatMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  return membership?.role ?? null
}

/**
 * Returns ChatGroups the user is eligible to join but is not yet a member of:
 * - COURSE groups: linked to a course the user is enrolled in
 * - ORG groups: all non-archived org groups
 * - PRIVATE groups are never returned (invite-only)
 */
export async function getEligibleGroups(
  userId: string,
): Promise<{ courses: ChatGroup[]; orgs: ChatGroup[] }> {
  const [existingMemberships, enrollments] = await Promise.all([
    prisma.chatMembership.findMany({
      where: { userId },
      select: { groupId: true },
    }),
    prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true },
    }),
  ])

  const memberGroupIds = existingMemberships.map((m) => m.groupId)
  const enrolledCourseIds = enrollments.map((e) => e.courseId)

  const [courseGroups, orgGroups] = await Promise.all([
    prisma.chatGroup.findMany({
      where: {
        type: 'COURSE',
        isArchived: false,
        courseId: enrolledCourseIds.length > 0 ? { in: enrolledCourseIds } : undefined,
        ...(memberGroupIds.length > 0 && { id: { notIn: memberGroupIds } }),
      },
    }),
    prisma.chatGroup.findMany({
      where: {
        type: 'ORG',
        isArchived: false,
        ...(memberGroupIds.length > 0 && { id: { notIn: memberGroupIds } }),
      },
    }),
  ])

  // If no enrollments, no course groups are eligible
  const courses = enrolledCourseIds.length > 0 ? courseGroups : []

  return { courses, orgs: orgGroups }
}
