import { prisma } from './prisma'

// ── Types ────────────────────────────────────────────────────────────────────

type SendCommunicationInput = {
  type: string       // 'announcement' | 'reminder' | 'escalation' | 'alert'
  subject: string
  body: string
  targetRoles: string[]
  targetUserIds?: string[]
  sentBy: string
  priority?: string  // 'low' | 'normal' | 'high' | 'urgent'
}

// ── Service functions ────────────────────────────────────────────────────────

export async function sendCommunication(input: SendCommunicationInput) {
  return prisma.complianceCommunication.create({
    data: {
      type: input.type,
      subject: input.subject,
      body: input.body,
      targetRoles: input.targetRoles,
      targetUserIds: input.targetUserIds ?? [],
      sentBy: input.sentBy,
      priority: input.priority ?? 'normal',
      readBy: [],
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function listCommunications(filters?: { type?: string; days?: number }) {
  const where: Record<string, unknown> = {}
  if (filters?.type) where.type = filters.type
  const daysBack = filters?.days ?? 30
  where.sentAt = { gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) }

  return prisma.complianceCommunication.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function markRead(communicationId: string, userId: string) {
  const comm = await prisma.complianceCommunication.findUnique({
    where: { id: communicationId },
    select: { readBy: true },
  })
  if (!comm) throw new Error('Communication not found')

  if (comm.readBy.includes(userId)) return comm

  return prisma.complianceCommunication.update({
    where: { id: communicationId },
    data: {
      readBy: { push: userId },
    },
  })
}

export async function getCommunicationsForUser(userId: string, userRole: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  return prisma.complianceCommunication.findMany({
    where: {
      sentAt: { gte: thirtyDaysAgo },
      OR: [
        { targetRoles: { has: userRole } },
        { targetUserIds: { has: userId } },
      ],
    },
    orderBy: { sentAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getUnreadCount(userId: string, userRole: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const comms = await prisma.complianceCommunication.findMany({
    where: {
      sentAt: { gte: thirtyDaysAgo },
      OR: [
        { targetRoles: { has: userRole } },
        { targetUserIds: { has: userId } },
      ],
    },
    select: { readBy: true },
  })

  return comms.filter((c) => !c.readBy.includes(userId)).length
}
