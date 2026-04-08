import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'

import {
  CollabMessageRole,
  CollabMode,
  type Prisma,
} from '../generated/prisma'
import { prisma } from './prisma'
import type {
  CollabMessageSummary,
  CollabParticipantSummary,
  CollabSessionState,
} from './collab-types'

const collabStreamConnections = new Map<string, number>()
const collabAiLocks = new Map<string, Promise<void>>()

export const collabSessionInclude = {
  tool: {
    select: {
      id: true,
      name: true,
      systemPrompt: true,
      personaName: true,
      collabEnabled: true,
      collabModes: true,
      collabMaxUsers: true,
      gamificationConfig: {
        select: {
          xpPerMessage: true,
          collabXpMultiplier: true,
          collabCompletionBonus: true,
        },
      },
    },
  },
  host: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      toolSession: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
  messages: {
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} satisfies Prisma.CollabSessionInclude

export type CollabSessionRecord = Prisma.CollabSessionGetPayload<{
  include: typeof collabSessionInclude
}>

function streamKey(sessionId: string, userId: string) {
  return `${sessionId}:${userId}`
}

export function registerCollabStreamConnection(sessionId: string, userId: string) {
  const key = streamKey(sessionId, userId)
  collabStreamConnections.set(key, (collabStreamConnections.get(key) ?? 0) + 1)
}

export function unregisterCollabStreamConnection(sessionId: string, userId: string) {
  const key = streamKey(sessionId, userId)
  const nextCount = Math.max((collabStreamConnections.get(key) ?? 1) - 1, 0)

  if (nextCount === 0) {
    collabStreamConnections.delete(key)
  } else {
    collabStreamConnections.set(key, nextCount)
  }

  return nextCount
}

export function collabRoleToClientRole(role: CollabMessageRole): 'user' | 'assistant' | 'system' {
  switch (role) {
    case CollabMessageRole.USER:
      return 'user'
    case CollabMessageRole.SYSTEM:
      return 'system'
    default:
      return 'assistant'
  }
}

export function serializeCollabParticipant(
  participant: CollabSessionRecord['participants'][number],
  hostId: string
): CollabParticipantSummary {
  return {
    id: participant.id,
    userId: participant.userId,
    name: participant.user.name,
    email: participant.user.email,
    avatarUrl: participant.user.avatarUrl,
    isHost: participant.userId === hostId,
    isActive: participant.isActive,
    messageCount: participant.messageCount,
    joinedAt: participant.joinedAt.toISOString(),
    leftAt: participant.leftAt ? participant.leftAt.toISOString() : null,
    turnOrder: participant.turnOrder ?? null,
    toolSessionId: participant.toolSession?.id ?? null,
  }
}

export function serializeCollabMessage(
  message: CollabSessionRecord['messages'][number]
): CollabMessageSummary {
  return {
    id: message.id,
    role: collabRoleToClientRole(message.role),
    content: message.content,
    senderId: message.senderId ?? null,
    senderName: message.sender?.name ?? null,
    senderEmail: message.sender?.email ?? null,
    clientMessageId: message.clientMessageId ?? null,
    createdAt: message.createdAt.toISOString(),
    turnNumber: message.turnNumber ?? null,
    triggeredArtifactUpdate: message.triggeredArtifactUpdate,
  }
}

export function serializeCollabSession(
  session: CollabSessionRecord,
  shareUrl: string
): CollabSessionState {
  const participants = session.participants.map((participant) =>
    serializeCollabParticipant(participant, session.hostId)
  )
  const currentTurnUser = participants.find((participant) => participant.userId === session.currentTurnUserId)

  return {
    id: session.id,
    toolId: session.toolId,
    toolName: session.tool.name,
    joinCode: session.joinCode,
    shareUrl,
    mode: session.mode,
    status: session.status,
    maxParticipants: session.maxParticipants,
    hostId: session.hostId,
    hostName: session.host.name,
    participants,
    messageHistory: session.messages.map(serializeCollabMessage),
    teamScore: session.teamScore,
    artifactContent: session.artifactContent ?? null,
    artifactTitle: session.artifactTitle ?? null,
    currentTurnUserId: session.currentTurnUserId ?? null,
    currentTurnUserName: currentTurnUser?.name ?? null,
    startedAt: session.startedAt ? session.startedAt.toISOString() : null,
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
  }
}

export async function getUserByEmail(email: string | null) {
  if (!email) return null
  return prisma.user.findUnique({
    where: { email },
  })
}

export function buildCollabShareUrl(request: NextRequest, toolId: string, joinCode: string) {
  return new URL(`/tools/${toolId}?collab=${joinCode}`, request.nextUrl.origin).toString()
}

export async function loadCollabSession(sessionId: string) {
  return prisma.collabSession.findUnique({
    where: { id: sessionId },
    include: collabSessionInclude,
  })
}

export function buildCollabSystemPrompt(
  session: CollabSessionRecord,
  syllabusContext?: string | null
) {
  const basePrompt =
    session.tool.systemPrompt?.trim() ||
    `You are Sandy, a collaborative educational AI assistant on The Sandbox platform at the University of Kentucky.`

  const participants = session.participants
    .map((participant) => `- ${participant.user.name} (${participant.user.email})`)
    .join('\n')

  const collabGuidance = [
    'You are leading a collaborative learning session with multiple students working together.',
    'The session includes the following participants:',
    participants,
    '',
    "Each user message is prefixed with the sender's name in brackets, like [Maya Johnson].",
    '',
    'Collaborative session guidelines:',
    '- When one student asks a question, invite the other(s) to share their perspective before you answer fully.',
    '- Notice when students agree or disagree with each other and facilitate productive discussion.',
    '- If one student seems more engaged, gently prompt the quieter student.',
    '- Build on what each student has said rather than starting fresh each time.',
    '- At natural transition points, summarize what the group has established together.',
  ].join('\n')

  if (syllabusContext?.trim()) {
    return `${basePrompt}\n\n${collabGuidance}\n\n---\nINSTRUCTOR CONTEXT FOR THIS SESSION:\n${syllabusContext.trim()}\n---`
  }

  return `${basePrompt}\n\n${collabGuidance}`
}

export function buildCollabAnthropicMessages(session: CollabSessionRecord) {
  return session.messages
    .filter((message) =>
      message.role === CollabMessageRole.USER || message.role === CollabMessageRole.ASSISTANT
    )
    .map((message) => {
      if (message.role === CollabMessageRole.ASSISTANT) {
        return {
          role: 'assistant' as const,
          content: message.content,
        }
      }

      const senderName = message.sender?.name?.trim() || 'Participant'
      return {
        role: 'user' as const,
        content: `[${senderName}] ${message.content}`,
      }
    })
}

export function createAnthropicClient() {
  return new Anthropic()
}

export async function withCollabAiLock(sessionId: string, fn: () => Promise<void>) {
  const current = collabAiLocks.get(sessionId) ?? Promise.resolve()
  const next = current.then(fn)
  collabAiLocks.set(
    sessionId,
    next.catch(() => {})
  )

  try {
    await next
  } finally {
    if (collabAiLocks.get(sessionId) === next) {
      collabAiLocks.delete(sessionId)
    }
  }
}

export async function awardCollabMessageXp(userId: string, toolId: string) {
  const gamificationConfig = await prisma.gamificationConfig
    .findUnique({
      where: { toolId },
      select: {
        xpPerMessage: true,
        collabXpMultiplier: true,
      },
    })
    .catch(() => null)

  const baseXp = gamificationConfig?.xpPerMessage ?? 2
  const multiplier = gamificationConfig?.collabXpMultiplier ?? 1.5
  const amount = Math.max(1, Math.round(baseXp * multiplier))

  await prisma.xPEvent
    .create({
      data: {
        userId,
        amount,
        reason: 'collab_message_sent',
        toolId,
      },
    })
    .catch(() => {})

  await prisma.user
    .update({
      where: { id: userId },
      data: {
        totalXP: {
          increment: amount,
        },
      },
    })
    .catch(() => {})
}

export async function awardCollabCompletionXp(session: CollabSessionRecord) {
  const bonus = session.tool.gamificationConfig?.collabCompletionBonus ?? 50
  if (bonus <= 0) return

  const participantsToReward = session.participants.filter((participant) => participant.xpAwarded <= 0)

  await Promise.all(
    participantsToReward.map(async (participant) => {
      await prisma.xPEvent
        .create({
          data: {
            userId: participant.userId,
            amount: bonus,
            reason: 'collab_session_complete',
            toolId: session.toolId,
          },
        })
        .catch(() => {})

      await prisma.user
        .update({
          where: { id: participant.userId },
          data: {
            totalXP: {
              increment: bonus,
            },
          },
        })
        .catch(() => {})

      await prisma.collabParticipant
        .update({
          where: { id: participant.id },
          data: { xpAwarded: bonus },
        })
        .catch(() => {})
    })
  )
}

export async function resolveCourseSyllabusContext(toolId: string, courseId: string | null | undefined) {
  if (!courseId) return null

  const courseLink = await prisma.courseToolLink
    .findUnique({
      where: {
        courseId_toolId: {
          courseId,
          toolId,
        },
      },
      select: {
        syllabusContext: true,
      },
    })
    .catch(() => null)

  return courseLink?.syllabusContext ?? null
}

export async function markParticipantInactive(sessionId: string, userId: string) {
  await prisma.collabParticipant.updateMany({
    where: {
      collabSessionId: sessionId,
      userId,
      isActive: true,
    },
    data: {
      isActive: false,
      leftAt: new Date(),
    },
  })
}

export async function reactivateParticipant(sessionId: string, userId: string) {
  await prisma.collabParticipant.updateMany({
    where: {
      collabSessionId: sessionId,
      userId,
    },
    data: {
      isActive: true,
      leftAt: null,
    },
  })
}

export async function promoteNextHostIfNeeded(session: CollabSessionRecord, departingUserId: string) {
  if (session.hostId !== departingUserId) return null

  const nextHost = session.participants.find(
    (participant) => participant.userId !== departingUserId && participant.isActive
  )

  if (!nextHost) return null

  await prisma.collabSession.update({
    where: { id: session.id },
    data: { hostId: nextHost.userId },
  })

  return nextHost.userId
}

export async function getAuthorizedParticipantSession(sessionId: string, userId: string) {
  const session = await loadCollabSession(sessionId)
  if (!session) return null

  const isParticipant = session.participants.some((participant) => participant.userId === userId)
  if (!isParticipant) return null

  return session
}

export function ensureModeSupported(tool: { collabEnabled: boolean; collabModes: string[] }, mode: CollabMode) {
  return tool.collabEnabled && tool.collabModes.includes(mode)
}

export function isConversationalTool(toolType: string) {
  return ['CHATBOT', 'SIMULATION', 'QUIZ', 'AI_INTERVIEW', 'DEBATE'].includes(toolType)
}

export function getLastUserMessageFromSession(session: CollabSessionRecord) {
  return [...session.messages].reverse().find((message) => message.role === CollabMessageRole.USER) ?? null
}

export async function endParticipantToolSessions(participants: CollabSessionRecord['participants']) {
  const toolSessionIds = participants
    .map((participant) => participant.toolSessionId)
    .filter((toolSessionId): toolSessionId is string => Boolean(toolSessionId))

  if (toolSessionIds.length === 0) return

  await prisma.toolSession.updateMany({
    where: {
      id: {
        in: toolSessionIds,
      },
    },
    data: {
      endedAt: new Date(),
      status: 'completed',
    },
  })
}

export function getSseEmail(request: NextRequest) {
  return request.nextUrl.searchParams.get('email')
}

export function createCollabError(message: string, code: string) {
  return {
    type: 'error' as const,
    payload: { message, code },
  }
}
