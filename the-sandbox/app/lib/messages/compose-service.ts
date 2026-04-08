import { prisma } from '../prisma'

interface ComposeResult {
  groupId: string
  isExisting: boolean
}

/**
 * Find or create a direct / group conversation.
 * - 1 recipient: look for existing PRIVATE group with exactly those 2 members; create if missing.
 * - 2+ recipients: always create a new PRIVATE group.
 */
export async function composeConversation(
  currentUserId: string,
  recipientIds: string[],
): Promise<ComposeResult | { error: string; status: number }> {
  if (recipientIds.length === 0) {
    return { error: 'At least one recipient is required', status: 400 }
  }

  // Prevent sending to self
  const uniqueRecipients = [...new Set(recipientIds.filter((id) => id !== currentUserId))]
  if (uniqueRecipients.length === 0) {
    return { error: 'Cannot create a conversation with only yourself', status: 400 }
  }

  // Validate all recipient IDs exist
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueRecipients } },
    select: { id: true, name: true },
  })
  if (users.length !== uniqueRecipients.length) {
    return { error: 'One or more users not found', status: 404 }
  }

  // 1-on-1: check for existing PRIVATE group with exactly these 2 members
  if (uniqueRecipients.length === 1) {
    const recipientId = uniqueRecipients[0]

    // Find groups where the current user is a member AND type = PRIVATE
    const myMemberships = await prisma.chatMembership.findMany({
      where: { userId: currentUserId },
      select: { groupId: true },
    })
    const myGroupIds = myMemberships.map((m) => m.groupId)

    if (myGroupIds.length > 0) {
      // Find PRIVATE groups that the recipient is also in
      const sharedGroups = await prisma.chatGroup.findMany({
        where: {
          id: { in: myGroupIds },
          type: 'PRIVATE',
          isArchived: false,
          memberships: {
            some: { userId: recipientId },
          },
        },
        include: {
          memberships: { select: { userId: true } },
        },
      })

      // Find one with exactly 2 members
      const existing = sharedGroups.find((g) => g.memberships.length === 2)
      if (existing) {
        return { groupId: existing.id, isExisting: true }
      }
    }
  }

  // Build group name from member names
  const allMembers = [
    ...users,
    await prisma.user.findUniqueOrThrow({
      where: { id: currentUserId },
      select: { id: true, name: true },
    }),
  ]
  const groupName =
    uniqueRecipients.length === 1
      ? users[0].name
      : allMembers.map((u) => u.name.split(' ')[0]).join(', ')

  // Create group + general channel + memberships in a transaction
  const group = await prisma.$transaction(async (tx) => {
    const newGroup = await tx.chatGroup.create({
      data: {
        name: groupName,
        type: 'PRIVATE',
        createdById: currentUserId,
      },
    })

    await tx.chatChannel.create({
      data: {
        groupId: newGroup.id,
        name: 'General',
        type: 'GENERAL',
        isDefault: true,
        createdById: currentUserId,
      },
    })

    // Add all members
    const memberIds = [currentUserId, ...uniqueRecipients]
    await tx.chatMembership.createMany({
      data: memberIds.map((userId, i) => ({
        userId,
        groupId: newGroup.id,
        role: i === 0 ? 'OWNER' as const : 'MEMBER' as const,
      })),
    })

    return newGroup
  })

  return { groupId: group.id, isExisting: false }
}
