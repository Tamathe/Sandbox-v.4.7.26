import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { z } from 'zod'

const CreateConversationBodySchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1),
  initialMessage: z.string().min(1).max(5000),
  title: z.string().max(200).optional(),
  isGroup: z.boolean().optional(),
})

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma: PrismaClient = new PrismaClient({ adapter })

function truncateContent(content: string, limit: number) {
  if (content.length <= limit) return content
  return `${content.slice(0, limit - 3)}...`
}

function formatConversationSummary(
  conversation: {
    id: string
    title: string | null
    isGroup: boolean
    lastMessageAt: Date
    participants: Array<{
      userId: string
      lastReadAt: Date | null
      user: { id: string; name: string; role: string }
    }>
    messages: Array<{
      content: string
      sender: { name: string }
    }>
  },
  currentUserId: string
) {
  const lastMessage = conversation.messages[0] ?? null
  const currentParticipant = conversation.participants.find((participant) => participant.userId === currentUserId)
  const otherParticipants = conversation.participants.filter((participant) => participant.userId !== currentUserId)

  return {
    id: conversation.id,
    title:
      conversation.title?.trim() ||
      (otherParticipants.length > 0
        ? otherParticipants.map((participant) => participant.user.name).join(', ')
        : 'Conversation'),
    isGroup: conversation.isGroup,
    lastMessageAt: conversation.lastMessageAt,
    participants: conversation.participants.map((participant) => ({
      id: participant.user.id,
      name: participant.user.name,
      role: participant.user.role,
    })),
    lastMessage: lastMessage
      ? {
          content: truncateContent(lastMessage.content, 80),
          senderName: lastMessage.sender.name,
        }
      : null,
    isUnread: currentParticipant
      ? currentParticipant.lastReadAt === null || conversation.lastMessageAt > currentParticipant.lastReadAt
      : false,
  }
}

export async function GET(request: NextRequest) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const checkExisting = request.nextUrl.searchParams.get('checkExisting')

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId: currentUser.id },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  const filteredConversations = checkExisting
    ? conversations.filter((conversation) => (
        !conversation.isGroup &&
        conversation.participants.length === 2 &&
        conversation.participants.some((participant) => participant.userId === checkExisting)
      ))
    : conversations

  return NextResponse.json(
    filteredConversations.map((conversation) => formatConversationSummary(conversation, currentUser.id))
  )
}

export async function POST(request: NextRequest) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const parsed = await parseRequestBody(request)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(CreateConversationBodySchema, parsed.data)
  if ('error' in validation) return validation.error
  const { participantIds: rawParticipantIds, initialMessage: rawInitialMessage, title: rawTitle, isGroup: rawIsGroup } = validation.value
  const participantIds: string[] = [...new Set(rawParticipantIds)].filter((participantId) => participantId !== currentUser.id)
  const initialMessage = rawInitialMessage.trim()
  const title = rawTitle?.trim() ?? ''
  const requestedGroup = rawIsGroup === true

  if (participantIds.length === 0 || !initialMessage) {
    return NextResponse.json({ error: 'participantIds and initialMessage are required' }, { status: 400 })
  }

  const allParticipantIds = [currentUser.id, ...participantIds]
  const participants = await prisma.user.findMany({
    where: { id: { in: allParticipantIds } },
    select: { id: true },
  })

  if (participants.length !== allParticipantIds.length) {
    return NextResponse.json({ error: 'One or more participants were not found' }, { status: 400 })
  }

  const isGroup = requestedGroup || participantIds.length > 1

  if (!isGroup && participantIds.length === 1) {
    const targetId = participantIds[0]!
    const existingConversation = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: currentUser.id } } },
          { participants: { some: { userId: targetId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    const exactConversation = existingConversation.find((conversation) => {
      const conversationParticipantIds = conversation.participants
        .map((participant) => participant.userId)
        .sort()
      const desiredIds = [currentUser.id, targetId].sort()
      return (
        conversationParticipantIds.length === desiredIds.length &&
        conversationParticipantIds.every((participantId, index) => participantId === desiredIds[index])
      )
    })

    if (exactConversation) {
      return NextResponse.json(formatConversationSummary(exactConversation, currentUser.id))
    }
  }

  const now = new Date()

  const conversation = await prisma.conversation.create({
    data: {
      title: isGroup ? title || null : null,
      isGroup,
      lastMessageAt: now,
      participants: {
        create: allParticipantIds.map((participantId) => ({
          user: {
            connect: {
              id: participantId,
            },
          },
          role: 'MEMBER',
          lastReadAt: participantId === currentUser.id ? now : null,
        })),
      },
      messages: {
        create: {
          content: initialMessage,
          sender: {
            connect: {
              id: currentUser.id,
            },
          },
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json(formatConversationSummary(conversation, currentUser.id), { status: 201 })
}
