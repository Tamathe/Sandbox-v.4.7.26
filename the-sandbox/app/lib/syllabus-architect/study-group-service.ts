/**
 * Study group service for peer learning on course map nodes.
 *
 * Students can form study groups around specific course map nodes,
 * chat with group members, and track shared progress.
 */

import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StudyGroupSummary {
  id: string
  name: string
  nodeId: string
  nodeLabel: string | null
  memberCount: number
  createdById: string
  createdAt: string
}

export interface StudyGroupDetail {
  id: string
  name: string
  nodeId: string
  courseId: string
  members: Array<{
    userId: string
    name: string
    avatarUrl: string | null
    joinedAt: string
  }>
  createdById: string
  createdAt: string
}

export interface GroupMessage {
  id: string
  userId: string
  userName: string
  avatarUrl: string | null
  content: string
  createdAt: string
}

export interface GroupProgress {
  nodeId: string
  totalMembers: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  completionRate: number
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a study group linked to a course map node.
 */
export async function createStudyGroup(
  courseId: string,
  nodeId: string,
  createdById: string,
  name: string,
): Promise<StudyGroupSummary> {
  const group = await prisma.studyGroup.create({
    data: {
      courseId,
      nodeId,
      name,
      createdById,
      members: {
        create: { userId: createdById }, // Creator auto-joins
      },
    },
    include: {
      _count: { select: { members: true } },
    },
  })

  // Look up node label
  const node = await prisma.mapNode.findFirst({
    where: { id: nodeId },
    select: { label: true },
  })

  return {
    id: group.id,
    name: group.name,
    nodeId: group.nodeId,
    nodeLabel: node?.label ?? null,
    memberCount: group._count.members,
    createdById: group.createdById,
    createdAt: group.createdAt.toISOString(),
  }
}

/**
 * List all study groups for a course with member counts.
 */
export async function getStudyGroups(courseId: string): Promise<StudyGroupSummary[]> {
  const groups = await prisma.studyGroup.findMany({
    where: { courseId },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Batch fetch node labels
  const nodeIds = [...new Set(groups.map((g) => g.nodeId))]
  const nodes = await prisma.mapNode.findMany({
    where: { id: { in: nodeIds } },
    select: { id: true, label: true },
  })
  const nodeMap = new Map(nodes.map((n) => [n.id, n.label]))

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    nodeId: g.nodeId,
    nodeLabel: nodeMap.get(g.nodeId) ?? null,
    memberCount: g._count.members,
    createdById: g.createdById,
    createdAt: g.createdAt.toISOString(),
  }))
}

/**
 * Get study group detail with members.
 */
export async function getStudyGroupMembers(groupId: string): Promise<StudyGroupDetail | null> {
  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!group) return null

  return {
    id: group.id,
    name: group.name,
    nodeId: group.nodeId,
    courseId: group.courseId,
    members: group.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      joinedAt: m.joinedAt.toISOString(),
    })),
    createdById: group.createdById,
    createdAt: group.createdAt.toISOString(),
  }
}

/**
 * Join a study group.
 */
export async function joinStudyGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    await prisma.studyGroupMember.create({
      data: { groupId, userId },
    })
    return true
  } catch {
    // Already a member (unique constraint)
    return false
  }
}

/**
 * Leave a study group.
 */
export async function leaveStudyGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    await prisma.studyGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    })
    return true
  } catch {
    return false
  }
}

// ── Chat ─────────────────────────────────────────────────────────────────────

/**
 * Send a message in a study group.
 */
export async function sendGroupMessage(
  groupId: string,
  userId: string,
  content: string,
): Promise<GroupMessage> {
  const msg = await prisma.studyGroupMessage.create({
    data: { groupId, userId, content },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  return {
    id: msg.id,
    userId: msg.user.id,
    userName: msg.user.name,
    avatarUrl: msg.user.avatarUrl,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  }
}

/**
 * Get messages for a study group, most recent first.
 */
export async function getGroupMessages(
  groupId: string,
  limit = 50,
  before?: string,
): Promise<GroupMessage[]> {
  const msgs = await prisma.studyGroupMessage.findMany({
    where: {
      groupId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return msgs.reverse().map((m) => ({
    id: m.id,
    userId: m.user.id,
    userName: m.user.name,
    avatarUrl: m.user.avatarUrl,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }))
}

// ── Progress ─────────────────────────────────────────────────────────────────

/**
 * Get aggregate progress for a study group's linked node.
 */
export async function getGroupProgress(groupId: string): Promise<GroupProgress | null> {
  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    include: {
      members: { select: { userId: true } },
    },
  })

  if (!group) return null

  const memberIds = group.members.map((m) => m.userId)
  if (memberIds.length === 0) {
    return {
      nodeId: group.nodeId,
      totalMembers: 0,
      completedCount: 0,
      inProgressCount: 0,
      notStartedCount: 0,
      completionRate: 0,
    }
  }

  // Check study plan completions for this node
  const plans = await prisma.studentStudyPlan.findMany({
    where: {
      courseId: group.courseId,
      nodeId: group.nodeId,
      studentId: { in: memberIds },
    },
    select: { studentId: true, completedAt: true },
  })

  const planMap = new Map(plans.map((p) => [p.studentId, p.completedAt]))
  let completed = 0
  let inProgress = 0
  let notStarted = 0

  for (const id of memberIds) {
    const plan = planMap.get(id)
    if (plan) {
      completed++
    } else if (planMap.has(id)) {
      inProgress++
    } else {
      notStarted++
    }
  }

  // Also count study plans with a target date but no completion as in-progress
  inProgress = plans.filter((p) => !p.completedAt).length
  completed = plans.filter((p) => p.completedAt).length
  notStarted = memberIds.length - completed - inProgress

  return {
    nodeId: group.nodeId,
    totalMembers: memberIds.length,
    completedCount: completed,
    inProgressCount: inProgress,
    notStartedCount: notStarted,
    completionRate: memberIds.length > 0 ? completed / memberIds.length : 0,
  }
}

/**
 * Get study group counts per node for badge display.
 */
export async function getNodeGroupCounts(courseId: string): Promise<Map<string, number>> {
  const groups = await prisma.studyGroup.findMany({
    where: { courseId },
    select: { nodeId: true },
  })

  const counts = new Map<string, number>()
  for (const g of groups) {
    counts.set(g.nodeId, (counts.get(g.nodeId) || 0) + 1)
  }
  return counts
}
