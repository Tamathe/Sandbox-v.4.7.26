import { prisma } from './prisma'

export async function listDataSharingAgreements() {
  return prisma.dataSharingAgreement.findMany({
    orderBy: { expiresAt: 'asc' },
  })
}

export async function getDataSharingAgreement(id: string) {
  return prisma.dataSharingAgreement.findUnique({ where: { id } })
}

export async function createDataSharingAgreement(data: {
  partnerInstitution: string
  dataScope: string
  legalBasis: string
  signedAt: Date
  expiresAt: Date
  contactEmail?: string
}) {
  return prisma.dataSharingAgreement.create({ data })
}

export async function updateDataSharingAgreement(
  id: string,
  data: {
    partnerInstitution?: string
    dataScope?: string
    legalBasis?: string
    signedAt?: Date
    expiresAt?: Date
    contactEmail?: string | null
    active?: boolean
  },
) {
  return prisma.dataSharingAgreement.update({ where: { id }, data })
}

export async function deleteDataSharingAgreement(id: string) {
  return prisma.dataSharingAgreement.delete({ where: { id } })
}
