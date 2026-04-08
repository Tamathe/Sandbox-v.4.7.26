import { prisma } from './prisma'

const VALID_TYPES = ['policy', 'dpa', 'certificate', 'audit-report', 'other']

export async function createDocument(data: {
  type: string
  title: string
  description?: string
  uploadedBy: string
  fileUrl?: string
  content?: string
  version?: string
  expiresAt?: string
}) {
  if (!VALID_TYPES.includes(data.type)) throw new Error(`Invalid document type: ${data.type}`)

  return prisma.complianceDocument.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description,
      uploadedBy: data.uploadedBy,
      fileUrl: data.fileUrl,
      content: data.content,
      version: data.version,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  })
}

export async function updateDocument(
  id: string,
  data: { title?: string; description?: string; version?: string; content?: string; expiresAt?: string | null },
) {
  return prisma.complianceDocument.update({
    where: { id },
    data: {
      ...data,
      expiresAt: data.expiresAt === null ? null : data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  })
}

export async function listDocuments(type?: string) {
  return prisma.complianceDocument.findMany({
    where: type ? { type } : undefined,
    include: { uploader: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getDocument(id: string) {
  return prisma.complianceDocument.findUnique({
    where: { id },
    include: { uploader: { select: { name: true, email: true } } },
  })
}

export async function deleteDocument(id: string) {
  return prisma.complianceDocument.delete({ where: { id } })
}

export async function getExpiringDocuments(withinDays: number = 60) {
  const threshold = new Date(Date.now() + withinDays * 86_400_000)
  return prisma.complianceDocument.findMany({
    where: {
      expiresAt: { not: null, lte: threshold, gte: new Date() },
    },
    include: { uploader: { select: { name: true, email: true } } },
    orderBy: { expiresAt: 'asc' },
  })
}
