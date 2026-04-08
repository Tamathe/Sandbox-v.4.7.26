import { prisma } from './prisma'

// ── Data Classification Service ─────────────────────────────────────────────
// Automated data classification system that tags platform data assets
// with sensitivity levels (public/internal/confidential/restricted).

export async function createClassification(data: {
  dataAsset: string
  classificationLevel: string
  sensitivityTags?: string[]
  ferpaProtected?: boolean
  piiContained?: boolean
  retentionCategory?: string
  owner?: string
  notes?: string
}) {
  return prisma.dataClassification.create({
    data: {
      dataAsset: data.dataAsset,
      classificationLevel: data.classificationLevel,
      sensitivityTags: data.sensitivityTags ?? [],
      ferpaProtected: data.ferpaProtected ?? false,
      piiContained: data.piiContained ?? false,
      retentionCategory: data.retentionCategory ?? null,
      owner: data.owner ?? null,
      notes: data.notes ?? null,
    },
  })
}

export async function updateClassification(
  id: string,
  data: {
    classificationLevel?: string
    sensitivityTags?: string[]
    ferpaProtected?: boolean
    piiContained?: boolean
    retentionCategory?: string | null
    owner?: string | null
    notes?: string | null
  },
) {
  return prisma.dataClassification.update({
    where: { id },
    data,
  })
}

export async function listClassifications(filterLevel?: string) {
  return prisma.dataClassification.findMany({
    where: filterLevel ? { classificationLevel: filterLevel } : undefined,
    orderBy: { dataAsset: 'asc' },
  })
}

export async function deleteClassification(id: string) {
  return prisma.dataClassification.delete({ where: { id } })
}

export async function getClassificationSummary() {
  const all = await prisma.dataClassification.findMany({
    select: {
      classificationLevel: true,
      piiContained: true,
      ferpaProtected: true,
    },
  })

  const countsByLevel: Record<string, number> = {}
  let piiCount = 0
  let ferpaCount = 0

  for (const c of all) {
    countsByLevel[c.classificationLevel] = (countsByLevel[c.classificationLevel] ?? 0) + 1
    if (c.piiContained) piiCount++
    if (c.ferpaProtected) ferpaCount++
  }

  return { countsByLevel, piiCount, ferpaCount, total: all.length }
}

// Pre-seed 12 canonical data asset classifications
const SEED_CLASSIFICATIONS: Array<{
  dataAsset: string
  classificationLevel: string
  sensitivityTags: string[]
  ferpaProtected: boolean
  piiContained: boolean
  notes: string
}> = [
  {
    dataAsset: 'User.email',
    classificationLevel: 'confidential',
    sensitivityTags: ['personal-identifier'],
    ferpaProtected: false,
    piiContained: true,
    notes: 'University email addresses — PII under FERPA directory information exception',
  },
  {
    dataAsset: 'User.personalContext',
    classificationLevel: 'confidential',
    sensitivityTags: ['personal-identifier', 'behavioral'],
    ferpaProtected: false,
    piiContained: true,
    notes: 'Free-text personal context provided by user during onboarding',
  },
  {
    dataAsset: 'ToolSession.chatMessages',
    classificationLevel: 'confidential',
    sensitivityTags: ['educational-record', 'ai-interaction'],
    ferpaProtected: true,
    piiContained: false,
    notes: 'AI chat transcripts that form part of educational records',
  },
  {
    dataAsset: 'ChatMessage.content',
    classificationLevel: 'confidential',
    sensitivityTags: ['communication', 'user-generated'],
    ferpaProtected: false,
    piiContained: false,
    notes: 'Direct messages between users on the platform',
  },
  {
    dataAsset: 'UserMemory.content',
    classificationLevel: 'restricted',
    sensitivityTags: ['personal-identifier', 'behavioral', 'ai-extracted'],
    ferpaProtected: true,
    piiContained: true,
    notes: 'AI-extracted personal facts — highest sensitivity due to automated profiling',
  },
  {
    dataAsset: 'StudentNote.content',
    classificationLevel: 'confidential',
    sensitivityTags: ['educational-record', 'user-generated'],
    ferpaProtected: true,
    piiContained: false,
    notes: 'Student study notes linked to courses',
  },
  {
    dataAsset: 'GradebookEntry',
    classificationLevel: 'restricted',
    sensitivityTags: ['educational-record', 'grade-data'],
    ferpaProtected: true,
    piiContained: false,
    notes: 'Grade records — strictly FERPA-protected educational records',
  },
  {
    dataAsset: 'FerpaIncident.description',
    classificationLevel: 'restricted',
    sensitivityTags: ['compliance', 'incident-report'],
    ferpaProtected: true,
    piiContained: false,
    notes: 'FERPA violation incident descriptions — restricted to compliance officers',
  },
  {
    dataAsset: 'ComplianceAuditLog',
    classificationLevel: 'internal',
    sensitivityTags: ['audit-trail', 'operational'],
    ferpaProtected: false,
    piiContained: false,
    notes: 'Platform compliance audit log entries — internal operational data',
  },
  {
    dataAsset: 'Tool.systemPrompt',
    classificationLevel: 'internal',
    sensitivityTags: ['intellectual-property', 'ai-configuration'],
    ferpaProtected: false,
    piiContained: false,
    notes: 'Educator-authored AI system prompts — institutional IP',
  },
  {
    dataAsset: 'CourseEnrollment',
    classificationLevel: 'confidential',
    sensitivityTags: ['educational-record', 'enrollment'],
    ferpaProtected: true,
    piiContained: false,
    notes: 'Student enrollment records linking students to courses',
  },
  {
    dataAsset: 'PortfolioItem',
    classificationLevel: 'confidential',
    sensitivityTags: ['personal-identifier', 'professional'],
    ferpaProtected: false,
    piiContained: true,
    notes: 'Student portfolio items — may contain PII in experience/education entries',
  },
]

export async function seedClassifications() {
  let created = 0
  let skipped = 0

  for (const seed of SEED_CLASSIFICATIONS) {
    const existing = await prisma.dataClassification.findUnique({
      where: { dataAsset: seed.dataAsset },
    })
    if (existing) {
      skipped++
      continue
    }
    await prisma.dataClassification.create({ data: seed })
    created++
  }

  return { created, skipped, total: SEED_CLASSIFICATIONS.length }
}
