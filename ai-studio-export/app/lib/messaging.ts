import { prisma } from './prisma'

async function findDirectConversation(userAId: string, userBId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: userAId } } },
        { participants: { some: { userId: userBId } } },
      ],
    },
    include: {
      participants: {
        select: { userId: true },
      },
    },
  })

  return (
    conversations.find((conversation) => {
      const participantIds = conversation.participants.map((participant) => participant.userId).sort()
      const wantedIds = [userAId, userBId].sort()
      return (
        participantIds.length === wantedIds.length &&
        participantIds.every((participantId, index) => participantId === wantedIds[index])
      )
    }) ?? null
  )
}

export async function sendDirectMessage(senderId: string, recipientId: string, content: string) {
  const now = new Date()
  let conversation = await findDirectConversation(senderId, recipientId)

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        lastMessageAt: now,
        participants: {
          create: [
            { userId: senderId, role: 'MEMBER', lastReadAt: now },
            { userId: recipientId, role: 'MEMBER', lastReadAt: null },
          ],
        },
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    })
  }

  const message = await prisma.message.create({
    data: {
      content,
      senderId,
      conversationId: conversation.id,
    },
  })

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: now },
  })

  await prisma.conversationParticipant.update({
    where: {
      userId_conversationId: {
        userId: senderId,
        conversationId: conversation.id,
      },
    },
    data: { lastReadAt: now },
  }).catch(() => {})

  return message
}
