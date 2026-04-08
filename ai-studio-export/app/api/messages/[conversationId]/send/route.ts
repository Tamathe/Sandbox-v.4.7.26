import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import { SendMessageSchema } from '../../../../lib/schemas'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma: PrismaClient = new PrismaClient({ adapter })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { conversationId } = await params
  const parsed = await parseRequestBody(request)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(SendMessageSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { content } = validation.value

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUser.id,
        conversationId,
      },
    },
  })

  if (!participant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        content,
        senderId: currentUser.id,
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    }),
    prisma.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId: currentUser.id,
          conversationId,
        },
      },
      data: { lastReadAt: now },
    }),
  ])

  return NextResponse.json(message, { status: 201 })
}
