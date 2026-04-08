import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import type { ClinicalCaseInput, ClinicalCaseListItem, ScoringRubric } from './types'

const LIST_SELECT = {
  id: true,
  title: true,
  chiefComplaint: true,
  program: true,
  difficulty: true,
  organSystems: true,
  tags: true,
  patientName: true,
  patientAge: true,
  patientSex: true,
  published: true,
  creatorId: true,
  createdAt: true,
} as const

export async function listCases(filters?: {
  program?: string
  difficulty?: string
  organSystem?: string
  courseId?: string
  creatorId?: string
  published?: boolean
}): Promise<ClinicalCaseListItem[]> {
  const where: Record<string, unknown> = {}

  if (filters?.program) where.program = filters.program
  if (filters?.difficulty) where.difficulty = filters.difficulty
  if (filters?.courseId) where.courseId = filters.courseId
  if (filters?.creatorId) where.creatorId = filters.creatorId
  if (filters?.published !== undefined) where.published = filters.published
  if (filters?.organSystem) where.organSystems = { has: filters.organSystem }

  return prisma.clinicalCase.findMany({
    where,
    select: LIST_SELECT,
    orderBy: { createdAt: 'desc' },
  }) as unknown as ClinicalCaseListItem[]
}

export async function getCase(caseId: string) {
  return prisma.clinicalCase.findUnique({ where: { id: caseId } })
}

export async function createCase(input: ClinicalCaseInput, creatorId: string) {
  validateRequiredFields(input)

  return prisma.clinicalCase.create({
    data: {
      title: input.title,
      chiefComplaint: input.chiefComplaint,
      program: input.program ?? 'DNP_PSYCHIATRY',
      difficulty: input.difficulty,
      targetYear: input.targetYear ?? null,
      organSystems: input.organSystems,
      learningObjectives: input.learningObjectives,
      tags: input.tags,
      patientName: input.patientName,
      patientAge: input.patientAge,
      patientSex: input.patientSex,
      patientPronouns: input.patientPronouns ?? null,
      personalityNotes: input.personalityNotes ?? null,
      historyOfPresentIllness: input.historyOfPresentIllness as Prisma.InputJsonValue,
      pastMedicalHistory: input.pastMedicalHistory as Prisma.InputJsonValue,
      medications: input.medications as Prisma.InputJsonValue,
      allergies: input.allergies as Prisma.InputJsonValue,
      socialHistory: input.socialHistory as Prisma.InputJsonValue,
      familyHistory: input.familyHistory as Prisma.InputJsonValue,
      reviewOfSystems: input.reviewOfSystems as Prisma.InputJsonValue,
      physicalExamFindings: input.physicalExamFindings as Prisma.InputJsonValue,
      vitalSigns: input.vitalSigns as Prisma.InputJsonValue,
      defaultNormalFindings: (input.defaultNormalFindings ?? null) as Prisma.InputJsonValue,
      availableLabs: input.availableLabs as Prisma.InputJsonValue,
      availableImaging: input.availableImaging as Prisma.InputJsonValue,
      correctDifferentials: input.correctDifferentials as Prisma.InputJsonValue,
      keyHistoryQuestions: input.keyHistoryQuestions as Prisma.InputJsonValue,
      keyExamManeuvers: input.keyExamManeuvers as Prisma.InputJsonValue,
      criticalActions: input.criticalActions as Prisma.InputJsonValue,
      scoringRubric: input.scoringRubric as unknown as Prisma.InputJsonValue,
      scaffoldingLevel: input.scaffoldingLevel ?? 'none',
      published: false,
      creator: { connect: { id: creatorId } },
      ...(input.courseId ? { course: { connect: { id: input.courseId } } } : {}),
    },
  })
}

export async function updateCase(
  caseId: string,
  input: Partial<ClinicalCaseInput>,
  userId: string,
) {
  const existing = await prisma.clinicalCase.findUnique({ where: { id: caseId } })
  if (!existing) throw Object.assign(new Error('Case not found'), { status: 404 })
  if (existing.creatorId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  // Build update data, casting Json fields through Prisma types
  const data: Prisma.ClinicalCaseUncheckedUpdateInput = {}
  if (input.title !== undefined) data.title = input.title
  if (input.chiefComplaint !== undefined) data.chiefComplaint = input.chiefComplaint
  if (input.program !== undefined) data.program = input.program
  if (input.difficulty !== undefined) data.difficulty = input.difficulty
  if (input.targetYear !== undefined) data.targetYear = input.targetYear
  if (input.organSystems !== undefined) data.organSystems = input.organSystems
  if (input.learningObjectives !== undefined) data.learningObjectives = input.learningObjectives
  if (input.tags !== undefined) data.tags = input.tags
  if (input.patientName !== undefined) data.patientName = input.patientName
  if (input.patientAge !== undefined) data.patientAge = input.patientAge
  if (input.patientSex !== undefined) data.patientSex = input.patientSex
  if (input.patientPronouns !== undefined) data.patientPronouns = input.patientPronouns
  if (input.personalityNotes !== undefined) data.personalityNotes = input.personalityNotes
  if (input.historyOfPresentIllness !== undefined) data.historyOfPresentIllness = input.historyOfPresentIllness as Prisma.InputJsonValue
  if (input.pastMedicalHistory !== undefined) data.pastMedicalHistory = input.pastMedicalHistory as Prisma.InputJsonValue
  if (input.medications !== undefined) data.medications = input.medications as Prisma.InputJsonValue
  if (input.allergies !== undefined) data.allergies = input.allergies as Prisma.InputJsonValue
  if (input.socialHistory !== undefined) data.socialHistory = input.socialHistory as Prisma.InputJsonValue
  if (input.familyHistory !== undefined) data.familyHistory = input.familyHistory as Prisma.InputJsonValue
  if (input.reviewOfSystems !== undefined) data.reviewOfSystems = input.reviewOfSystems as Prisma.InputJsonValue
  if (input.physicalExamFindings !== undefined) data.physicalExamFindings = input.physicalExamFindings as Prisma.InputJsonValue
  if (input.vitalSigns !== undefined) data.vitalSigns = input.vitalSigns as Prisma.InputJsonValue
  if (input.defaultNormalFindings !== undefined) data.defaultNormalFindings = input.defaultNormalFindings as Prisma.InputJsonValue
  if (input.availableLabs !== undefined) data.availableLabs = input.availableLabs as Prisma.InputJsonValue
  if (input.availableImaging !== undefined) data.availableImaging = input.availableImaging as Prisma.InputJsonValue
  if (input.correctDifferentials !== undefined) data.correctDifferentials = input.correctDifferentials as Prisma.InputJsonValue
  if (input.keyHistoryQuestions !== undefined) data.keyHistoryQuestions = input.keyHistoryQuestions as Prisma.InputJsonValue
  if (input.keyExamManeuvers !== undefined) data.keyExamManeuvers = input.keyExamManeuvers as Prisma.InputJsonValue
  if (input.criticalActions !== undefined) data.criticalActions = input.criticalActions as Prisma.InputJsonValue
  if (input.scoringRubric !== undefined) data.scoringRubric = input.scoringRubric as unknown as Prisma.InputJsonValue
  if (input.scaffoldingLevel !== undefined) data.scaffoldingLevel = input.scaffoldingLevel
  if (input.published !== undefined) data.published = input.published
  if (input.courseId !== undefined) data.courseId = input.courseId

  return prisma.clinicalCase.update({ where: { id: caseId }, data })
}

export async function deleteCase(caseId: string, userId: string) {
  const existing = await prisma.clinicalCase.findUnique({ where: { id: caseId } })
  if (!existing) throw Object.assign(new Error('Case not found'), { status: 404 })
  if (existing.creatorId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const encounterCount = await prisma.clinicalEncounter.count({ where: { caseId } })
  if (encounterCount > 0) {
    throw Object.assign(
      new Error('Cannot delete a case that has existing encounters'),
      { status: 409 },
    )
  }

  return prisma.clinicalCase.delete({ where: { id: caseId } })
}

export async function publishCase(caseId: string, userId: string) {
  const existing = await prisma.clinicalCase.findUnique({ where: { id: caseId } })
  if (!existing) throw Object.assign(new Error('Case not found'), { status: 404 })
  if (existing.creatorId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  // Validate completeness — all Json fields must be non-empty
  const jsonFields = [
    'historyOfPresentIllness',
    'pastMedicalHistory',
    'medications',
    'allergies',
    'socialHistory',
    'familyHistory',
    'reviewOfSystems',
    'physicalExamFindings',
    'vitalSigns',
    'availableLabs',
    'availableImaging',
    'correctDifferentials',
    'keyHistoryQuestions',
    'keyExamManeuvers',
    'criticalActions',
  ] as const

  for (const field of jsonFields) {
    const val = existing[field]
    if (val === null || val === undefined) {
      throw Object.assign(new Error(`Cannot publish: ${field} is empty`), { status: 400 })
    }
    // Empty arrays are valid (e.g. no allergies/medications), but empty objects are not
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as object).length === 0) {
      throw Object.assign(new Error(`Cannot publish: ${field} is empty`), { status: 400 })
    }
  }

  // Validate rubric weights sum to 1
  const rubric = existing.scoringRubric as ScoringRubric | null
  if (!rubric) throw Object.assign(new Error('Cannot publish: scoringRubric is empty'), { status: 400 })

  const weightSum =
    rubric.historyWeight +
    rubric.examWeight +
    rubric.differentialWeight +
    rubric.planWeight +
    rubric.communicationWeight

  if (Math.abs(weightSum - 1) > 0.01) {
    throw Object.assign(
      new Error(`Cannot publish: rubric weights sum to ${weightSum}, must equal 1`),
      { status: 400 },
    )
  }

  return prisma.clinicalCase.update({
    where: { id: caseId },
    data: { published: true },
  })
}

function validateRequiredFields(input: ClinicalCaseInput) {
  if (!input.title?.trim()) throw Object.assign(new Error('title is required'), { status: 400 })
  if (!input.chiefComplaint?.trim()) throw Object.assign(new Error('chiefComplaint is required'), { status: 400 })
  if (!input.patientName?.trim()) throw Object.assign(new Error('patientName is required'), { status: 400 })
  if (input.patientAge == null || input.patientAge < 0) throw Object.assign(new Error('patientAge is required'), { status: 400 })
  if (!input.patientSex?.trim()) throw Object.assign(new Error('patientSex is required'), { status: 400 })
}
