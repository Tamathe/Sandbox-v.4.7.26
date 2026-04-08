import { prisma } from './prisma'

export async function listIncidents(filters?: { status?: string; severity?: string }) {
  const where: Record<string, unknown> = {}
  if (filters?.status) where.status = filters.status
  if (filters?.severity) where.severity = filters.severity

  return prisma.ferpaIncident.findMany({
    where,
    include: {
      reportedBy: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getIncident(id: string) {
  return prisma.ferpaIncident.findUnique({
    where: { id },
    include: {
      reportedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}

export async function createIncident(data: {
  reportedById: string
  description: string
  severity: string
}) {
  const validSeverities = ['low', 'medium', 'high', 'critical']
  if (!validSeverities.includes(data.severity)) {
    throw new Error(`Invalid severity: ${data.severity}`)
  }

  return prisma.ferpaIncident.create({
    data: {
      reportedById: data.reportedById,
      description: data.description,
      severity: data.severity,
      status: 'open',
    },
    include: {
      reportedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}

export async function updateIncident(
  id: string,
  data: {
    status?: string
    resolution?: string
  },
) {
  const validStatuses = ['open', 'investigating', 'resolved', 'dismissed']
  if (data.status && !validStatuses.includes(data.status)) {
    throw new Error(`Invalid status: ${data.status}`)
  }

  const updateData: Record<string, unknown> = {}
  if (data.status) updateData.status = data.status
  if (data.resolution !== undefined) updateData.resolution = data.resolution

  // Set resolvedAt when resolving or dismissing
  if (data.status === 'resolved' || data.status === 'dismissed') {
    updateData.resolvedAt = new Date()
  }
  // Clear resolvedAt if re-opening
  if (data.status === 'open' || data.status === 'investigating') {
    updateData.resolvedAt = null
  }

  return prisma.ferpaIncident.update({
    where: { id },
    data: updateData,
    include: {
      reportedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}
