import { prisma } from './prisma'

// ── Types ────────────────────────────────────────────────────────────────────

type CreateAssessmentInput = {
  vendorName: string
  dpaId?: string
  assessmentDate: Date
  riskLevel: string
  dataCategories: string[]
  securityMeasures: string[]
  findings: unknown
  overallScore: number
  assessedBy: string
  nextReviewDate?: Date
}

type UpdateAssessmentInput = Partial<Omit<CreateAssessmentInput, 'assessedBy'>>

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createAssessment(input: CreateAssessmentInput) {
  return prisma.vendorRiskAssessment.create({
    data: {
      vendorName: input.vendorName,
      dpaId: input.dpaId || null,
      assessmentDate: input.assessmentDate,
      riskLevel: input.riskLevel,
      dataCategories: input.dataCategories,
      securityMeasures: input.securityMeasures,
      findings: input.findings as never,
      overallScore: input.overallScore,
      assessedBy: input.assessedBy,
      nextReviewDate: input.nextReviewDate || null,
    },
    include: {
      assessor: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function updateAssessment(id: string, input: UpdateAssessmentInput) {
  const data: Record<string, unknown> = {}
  if (input.vendorName !== undefined) data.vendorName = input.vendorName
  if (input.dpaId !== undefined) data.dpaId = input.dpaId || null
  if (input.assessmentDate !== undefined) data.assessmentDate = input.assessmentDate
  if (input.riskLevel !== undefined) data.riskLevel = input.riskLevel
  if (input.dataCategories !== undefined) data.dataCategories = input.dataCategories
  if (input.securityMeasures !== undefined) data.securityMeasures = input.securityMeasures
  if (input.findings !== undefined) data.findings = input.findings as never
  if (input.overallScore !== undefined) data.overallScore = input.overallScore
  if (input.nextReviewDate !== undefined) data.nextReviewDate = input.nextReviewDate || null

  return prisma.vendorRiskAssessment.update({
    where: { id },
    data,
    include: {
      assessor: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function listAssessments() {
  return prisma.vendorRiskAssessment.findMany({
    include: {
      assessor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { assessmentDate: 'desc' },
  })
}

export async function deleteAssessment(id: string) {
  return prisma.vendorRiskAssessment.delete({ where: { id } })
}

export async function getAssessmentsByRisk() {
  const all = await prisma.vendorRiskAssessment.findMany({
    select: { riskLevel: true },
  })

  const grouped: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const a of all) {
    grouped[a.riskLevel] = (grouped[a.riskLevel] || 0) + 1
  }

  return grouped
}

export async function getOverdueReviews() {
  return prisma.vendorRiskAssessment.findMany({
    where: {
      nextReviewDate: { lt: new Date() },
    },
    include: {
      assessor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { nextReviewDate: 'asc' },
  })
}
