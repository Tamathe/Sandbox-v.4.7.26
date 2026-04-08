import type { AssessmentEvidence } from '../../generated/prisma'
import { prisma } from '../prisma'
import {
  clampUnit,
  summarizeAssessmentEvidence,
  type AssessmentEvidenceRecord,
  type AssessmentEvidenceSummary,
  type EvidenceInput,
  type EvidenceScoringInput,
  type EvidenceUpdateInput,
} from './types'

function serializeEvidence(evidence: AssessmentEvidence): AssessmentEvidenceRecord {
  return {
    id: evidence.id,
    gradebookEntryId: evidence.gradebookEntryId,
    evidenceType: evidence.evidenceType,
    sourceId: evidence.sourceId,
    sourceLabel: evidence.sourceLabel,
    studentAnnotation: evidence.studentAnnotation ?? null,
    annotatedAt: evidence.annotatedAt?.toISOString() ?? null,
    aiProcessScore: evidence.aiProcessScore ?? null,
    aiCoherenceScore: evidence.aiCoherenceScore ?? null,
    aiDepthScore: evidence.aiDepthScore ?? null,
    aiScoringRationale: evidence.aiScoringRationale ?? null,
    facultyScore: evidence.facultyScore ?? null,
    facultyNotes: evidence.facultyNotes ?? null,
    reviewedAt: evidence.reviewedAt?.toISOString() ?? null,
    weight: evidence.weight,
    createdAt: evidence.createdAt.toISOString(),
  }
}

async function getEvidenceModelsForEntry(gradebookEntryId: string) {
  return prisma.assessmentEvidence.findMany({
    where: { gradebookEntryId },
    orderBy: { createdAt: 'desc' },
  })
}

function summarizeEvidenceRecords(
  evidence: AssessmentEvidenceRecord[],
  options?: {
    processScore?: number | null
    compositeMethod?: string | null
  }
): AssessmentEvidenceSummary {
  return summarizeAssessmentEvidence(evidence, options)
}

export async function refreshGradebookEvidenceSummary(gradebookEntryId: string): Promise<AssessmentEvidenceSummary> {
  const evidenceModels = await getEvidenceModelsForEntry(gradebookEntryId)
  const evidence = evidenceModels.map(serializeEvidence)
  const summary = summarizeEvidenceRecords(evidence)

  await prisma.gradebookEntry.update({
    where: { id: gradebookEntryId },
    data: {
      compositeMethod: summary.compositeMethod,
      processScore: summary.processScore,
    },
  })

  return summary
}

export async function listEvidenceForGradebookEntry(gradebookEntryId: string): Promise<{
  evidence: AssessmentEvidenceRecord[]
  summary: AssessmentEvidenceSummary
}> {
  const entry = await prisma.gradebookEntry.findUnique({
    where: { id: gradebookEntryId },
    select: {
      compositeMethod: true,
      processScore: true,
      evidence: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!entry) {
    throw new Error('Gradebook entry not found')
  }

  const evidence = entry.evidence.map(serializeEvidence)

  return {
    evidence,
    summary: summarizeEvidenceRecords(evidence, {
      processScore: entry.processScore,
      compositeMethod: entry.compositeMethod,
    }),
  }
}

export async function createEvidence(input: EvidenceInput): Promise<{
  evidence: AssessmentEvidenceRecord
  summary: AssessmentEvidenceSummary
}> {
  const existing = await prisma.assessmentEvidence.findUnique({
    where: {
      gradebookEntryId_evidenceType_sourceId: {
        gradebookEntryId: input.gradebookEntryId,
        evidenceType: input.evidenceType,
        sourceId: input.sourceId,
      },
    },
  })

  const evidence = existing
    ? existing
    : await prisma.assessmentEvidence.create({
        data: {
          gradebookEntryId: input.gradebookEntryId,
          evidenceType: input.evidenceType,
          sourceId: input.sourceId,
          sourceLabel: input.sourceLabel,
          weight: input.weight ?? 1,
          studentAnnotation: input.studentAnnotation ?? undefined,
          annotatedAt: input.studentAnnotation ? new Date() : undefined,
        },
      })

  const summary = await refreshGradebookEvidenceSummary(input.gradebookEntryId)

  return {
    evidence: serializeEvidence(evidence),
    summary,
  }
}

export async function updateEvidence(id: string, input: EvidenceUpdateInput): Promise<{
  evidence: AssessmentEvidenceRecord
  summary: AssessmentEvidenceSummary
}> {
  const existing = await prisma.assessmentEvidence.findUnique({
    where: { id },
    select: { gradebookEntryId: true },
  })

  if (!existing) {
    throw new Error('Assessment evidence not found')
  }

  const touchesFacultyFields =
    input.facultyScore !== undefined ||
    input.facultyNotes !== undefined ||
    input.weight !== undefined

  const updated = await prisma.assessmentEvidence.update({
    where: { id },
    data: {
      ...(input.studentAnnotation !== undefined
        ? {
            studentAnnotation: input.studentAnnotation,
            annotatedAt: input.studentAnnotation ? new Date() : null,
          }
        : {}),
      ...(input.facultyScore !== undefined ? { facultyScore: input.facultyScore } : {}),
      ...(input.facultyNotes !== undefined ? { facultyNotes: input.facultyNotes } : {}),
      ...(input.weight !== undefined ? { weight: input.weight } : {}),
      ...(touchesFacultyFields ? { reviewedAt: new Date() } : {}),
    },
  })

  const summary = await refreshGradebookEvidenceSummary(existing.gradebookEntryId)

  return {
    evidence: serializeEvidence(updated),
    summary,
  }
}

export async function updateEvidenceScoring(
  id: string,
  input: EvidenceScoringInput
): Promise<{
  evidence: AssessmentEvidenceRecord
  summary: AssessmentEvidenceSummary
}> {
  const existing = await prisma.assessmentEvidence.findUnique({
    where: { id },
    select: { gradebookEntryId: true },
  })

  if (!existing) {
    throw new Error('Assessment evidence not found')
  }

  const updated = await prisma.assessmentEvidence.update({
    where: { id },
    data: {
      ...(input.aiProcessScore !== undefined
        ? { aiProcessScore: clampUnit(input.aiProcessScore) }
        : {}),
      ...(input.aiCoherenceScore !== undefined
        ? { aiCoherenceScore: clampUnit(input.aiCoherenceScore) }
        : {}),
      ...(input.aiDepthScore !== undefined
        ? { aiDepthScore: clampUnit(input.aiDepthScore) }
        : {}),
      ...(input.aiScoringRationale !== undefined
        ? { aiScoringRationale: input.aiScoringRationale?.trim() || null }
        : {}),
    },
  })

  const summary = await refreshGradebookEvidenceSummary(existing.gradebookEntryId)

  return {
    evidence: serializeEvidence(updated),
    summary,
  }
}

export async function deleteEvidence(id: string): Promise<{
  deletedId: string
  gradebookEntryId: string
  summary: AssessmentEvidenceSummary
}> {
  const existing = await prisma.assessmentEvidence.findUnique({
    where: { id },
    select: { gradebookEntryId: true },
  })

  if (!existing) {
    throw new Error('Assessment evidence not found')
  }

  await prisma.assessmentEvidence.delete({ where: { id } })
  const summary = await refreshGradebookEvidenceSummary(existing.gradebookEntryId)

  return {
    deletedId: id,
    gradebookEntryId: existing.gradebookEntryId,
    summary,
  }
}

export async function linkSubmissionEvidence(input: {
  gradebookEntryId: string
  assignmentTitle: string
  submissionType: string
  sessionId?: string | null
  studentAnnotation?: string | null
}) {
  if (input.submissionType !== 'AI_EXPERIENCE' || !input.sessionId) {
    return null
  }

  return createEvidence({
    gradebookEntryId: input.gradebookEntryId,
    evidenceType: 'SANDY_TRANSCRIPT',
    sourceId: input.sessionId,
    sourceLabel: `Sandy transcript: ${input.assignmentTitle}`,
    studentAnnotation: input.studentAnnotation ?? null,
  })
}
