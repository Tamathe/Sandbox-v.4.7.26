import { prisma } from './prisma'

export async function listDPAs() {
  return prisma.dataProcessingAgreement.findMany({
    orderBy: { expiresAt: 'asc' },
  })
}

export async function getDPA(id: string) {
  return prisma.dataProcessingAgreement.findUnique({ where: { id } })
}

export async function createDPA(data: {
  vendorName: string
  purpose: string
  dataCategories: string[]
  signedAt: Date
  expiresAt: Date
  documentUrl?: string
}) {
  return prisma.dataProcessingAgreement.create({ data })
}

export async function updateDPA(
  id: string,
  data: {
    vendorName?: string
    purpose?: string
    dataCategories?: string[]
    signedAt?: Date
    expiresAt?: Date
    documentUrl?: string | null
    active?: boolean
  },
) {
  return prisma.dataProcessingAgreement.update({ where: { id }, data })
}

export async function deleteDPA(id: string) {
  return prisma.dataProcessingAgreement.delete({ where: { id } })
}
