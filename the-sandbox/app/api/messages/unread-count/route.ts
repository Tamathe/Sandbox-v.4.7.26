import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma: PrismaClient = new PrismaClient({ adapter })

export async function GET(request: NextRequest) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: currentUser.id },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          lastMessageAt: true,
        },
      },
    },
  })

  const count = participants.filter((participant) => (
    participant.lastReadAt === null || participant.conversation.lastMessageAt > participant.lastReadAt
  )).length

  return NextResponse.json({ count })
}
