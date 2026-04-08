import { prisma } from '../prisma'
import { getUserGroupRole } from '../group-chat-service'
import type { ChatMemberRole } from '../../generated/prisma'
import type { ServiceResult } from '../types'

// ── Rename Group ─────────────────────────────────────────────────────────────

export async function renameGroup(
  userId: string,
  groupId: string,
  newName: string,
): Promise<ServiceResult<{ name: string }>> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Not a member', status: 403 }
  if (role !== 'OWNER' && role !== 'MODERATOR') {
    return { error: 'Only owners or moderators can rename', status: 403 }
  }

  const trimmed = newName.trim()
  if (!trimmed || trimmed.length > 100) {
    return { error: 'Name must be 1–100 characters', status: 400 }
  }

  await prisma.chatGroup.update({
    where: { id: groupId },
    data: { name: trimmed },
  })

  return { success: true, name: trimmed }
}

// ── Add Members ──────────────────────────────────────────────────────────────

export async function addMembers(
  userId: string,
  groupId: string,
  userIds: string[],
): Promise<ServiceResult<{ added: number }>> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Not a member', status: 403 }
  if (role !== 'OWNER' && role !== 'MODERATOR') {
    return { error: 'Only owners or moderators can add members', status: 403 }
  }

  if (!userIds.length || userIds.length > 50) {
    return { error: 'Provide 1–50 user IDs', status: 400 }
  }

  // Validate users exist
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  })
  const validIds = new Set(users.map((u) => u.id))

  // Filter out already-members
  const existing = await prisma.chatMembership.findMany({
    where: { groupId, userId: { in: [...validIds] } },
    select: { userId: true },
  })
  const existingIds = new Set(existing.map((m) => m.userId))
  const toAdd = [...validIds].filter((id) => !existingIds.has(id))

  if (toAdd.length > 0) {
    await prisma.chatMembership.createMany({
      data: toAdd.map((uid) => ({
        userId: uid,
        groupId,
        role: 'MEMBER' as ChatMemberRole,
      })),
    })
  }

  return { success: true, added: toAdd.length }
}

// ── Remove Member ────────────────────────────────────────────────────────────

export async function removeMember(
  userId: string,
  groupId: string,
  targetUserId: string,
): Promise<ServiceResult> {
  if (userId === targetUserId) {
    return { error: 'Use leave instead of removing yourself', status: 400 }
  }

  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Not a member', status: 403 }

  const targetRole = await getUserGroupRole(targetUserId, groupId)
  if (targetRole === null) return { error: 'Target is not a member', status: 404 }

  // OWNER can remove anyone; MODERATOR can only remove MEMBERs
  if (role === 'OWNER') {
    // OK
  } else if (role === 'MODERATOR') {
    if (targetRole !== 'MEMBER') {
      return { error: 'Moderators can only remove members', status: 403 }
    }
  } else {
    return { error: 'Only owners or moderators can remove members', status: 403 }
  }

  await prisma.chatMembership.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  })

  return { success: true }
}

// ── Leave Group ──────────────────────────────────────────────────────────────

export async function leaveGroup(
  userId: string,
  groupId: string,
): Promise<ServiceResult> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Not a member', status: 403 }

  // If owner and there are other members, transfer ownership
  if (role === 'OWNER') {
    const otherMembers = await prisma.chatMembership.findMany({
      where: { groupId, userId: { not: userId } },
      orderBy: { joinedAt: 'asc' },
      take: 1,
      select: { userId: true },
    })

    if (otherMembers.length > 0) {
      await prisma.chatMembership.update({
        where: { userId_groupId: { userId: otherMembers[0].userId, groupId } },
        data: { role: 'OWNER' },
      })
    }
  }

  await prisma.chatMembership.delete({
    where: { userId_groupId: { userId, groupId } },
  })

  return { success: true }
}

// ── Get Members with Roles ───────────────────────────────────────────────────

export async function getGroupMembers(
  userId: string,
  groupId: string,
): Promise<
  | {
      members: {
        id: string
        name: string
        email: string
        avatarUrl: string | null
        role: ChatMemberRole
        joinedAt: string
      }[]
      currentUserRole: ChatMemberRole
    }
  | { error: string; status: number }
> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Not a member', status: 403 }

  const memberships = await prisma.chatMembership.findMany({
    where: { groupId },
    orderBy: { joinedAt: 'asc' },
    select: {
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  })

  return {
    members: memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    currentUserRole: role,
  }
}
