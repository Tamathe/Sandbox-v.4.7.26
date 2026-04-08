import { prisma } from './prisma'

// ── Types ────────────────────────────────────────────────────────────────────

type CreateEvidenceInput = {
  requirementId?: string
  evidenceType: string
  title: string
  description?: string
  content?: string
  collectedBy: string
  validUntil?: Date
  tags: string[]
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createEvidence(input: CreateEvidenceInput) {
  return prisma.complianceEvidence.create({
    data: {
      requirementId: input.requirementId || null,
      evidenceType: input.evidenceType,
      title: input.title,
      description: input.description || null,
      content: input.content || null,
      collectedBy: input.collectedBy,
      validUntil: input.validUntil || null,
      tags: input.tags,
    },
    include: {
      collector: { select: { id: true, name: true, email: true } },
      requirement: { select: { id: true, title: true, regulation: true } },
    },
  })
}

export async function listEvidence(filters?: { requirementId?: string; evidenceType?: string }) {
  const where: Record<string, unknown> = {}
  if (filters?.requirementId) where.requirementId = filters.requirementId
  if (filters?.evidenceType) where.evidenceType = filters.evidenceType

  return prisma.complianceEvidence.findMany({
    where,
    include: {
      collector: { select: { id: true, name: true, email: true } },
      requirement: { select: { id: true, title: true, regulation: true } },
    },
    orderBy: { collectedAt: 'desc' },
  })
}

export async function deleteEvidence(id: string) {
  return prisma.complianceEvidence.delete({ where: { id } })
}

export async function getEvidenceForRequirement(requirementId: string) {
  return prisma.complianceEvidence.findMany({
    where: { requirementId },
    include: {
      collector: { select: { id: true, name: true, email: true } },
    },
    orderBy: { collectedAt: 'desc' },
  })
}

export async function getEvidenceSummary() {
  const allEvidence = await prisma.complianceEvidence.findMany({
    select: { evidenceType: true, requirementId: true },
  })

  const byType: Record<string, number> = {}
  const byRequirement: Record<string, number> = {}

  for (const e of allEvidence) {
    byType[e.evidenceType] = (byType[e.evidenceType] || 0) + 1
    if (e.requirementId) {
      byRequirement[e.requirementId] = (byRequirement[e.requirementId] || 0) + 1
    }
  }

  return { total: allEvidence.length, byType, byRequirement }
}

// ── Auto-collect ─────────────────────────────────────────────────────────────

export async function autoCollectEvidence(adminUserId: string) {
  const created: string[] = []

  // Look up regulatory requirements to link evidence
  const requirements = await prisma.regulatoryRequirement.findMany({
    select: { id: true, regulation: true, title: true },
  })
  const reqByRegulation = new Map(requirements.map((r) => [r.regulation, r]))

  // 1. Count TOS acceptances
  const tosCount = await prisma.user.count({ where: { tosAcceptedAt: { not: null } } })
  const totalUsers = await prisma.user.count()
  const ferpaReq = reqByRegulation.get('FERPA')
  await prisma.complianceEvidence.create({
    data: {
      requirementId: ferpaReq?.id || null,
      evidenceType: 'automated',
      title: 'Terms of Service Acceptance Rate',
      description: `${tosCount} of ${totalUsers} users have accepted the Terms of Service.`,
      content: JSON.stringify({ tosCount, totalUsers, rate: totalUsers > 0 ? Math.round((tosCount / totalUsers) * 100) : 0 }),
      collectedBy: adminUserId,
      tags: ['tos', 'automated', 'acceptance-rate'],
    },
  })
  created.push('TOS Acceptance Rate')

  // 2. Data consent acceptance
  const consentCount = await prisma.user.count({ where: { dataConsentAt: { not: null } } })
  const gdprReq = reqByRegulation.get('GDPR')
  await prisma.complianceEvidence.create({
    data: {
      requirementId: gdprReq?.id || null,
      evidenceType: 'automated',
      title: 'Data Consent Acceptance Rate',
      description: `${consentCount} of ${totalUsers} users have accepted data consent.`,
      content: JSON.stringify({ consentCount, totalUsers, rate: totalUsers > 0 ? Math.round((consentCount / totalUsers) * 100) : 0 }),
      collectedBy: adminUserId,
      tags: ['consent', 'automated', 'acceptance-rate'],
    },
  })
  created.push('Data Consent Acceptance Rate')

  // 3. FERPA acknowledgement
  const ferpaCount = await prisma.user.count({ where: { ferpaAckAt: { not: null } } })
  await prisma.complianceEvidence.create({
    data: {
      requirementId: ferpaReq?.id || null,
      evidenceType: 'automated',
      title: 'FERPA Acknowledgement Rate',
      description: `${ferpaCount} of ${totalUsers} users have acknowledged FERPA requirements.`,
      content: JSON.stringify({ ferpaCount, totalUsers, rate: totalUsers > 0 ? Math.round((ferpaCount / totalUsers) * 100) : 0 }),
      collectedBy: adminUserId,
      tags: ['ferpa', 'automated', 'acknowledgement-rate'],
    },
  })
  created.push('FERPA Acknowledgement Rate')

  // 4. DPA status summary
  const activeDpas = await prisma.dataProcessingAgreement.count({ where: { active: true } })
  const expiredDpas = await prisma.dataProcessingAgreement.count({ where: { expiresAt: { lt: new Date() } } })
  await prisma.complianceEvidence.create({
    data: {
      requirementId: gdprReq?.id || null,
      evidenceType: 'automated',
      title: 'Data Processing Agreement Status',
      description: `${activeDpas} active DPAs; ${expiredDpas} expired.`,
      content: JSON.stringify({ activeDpas, expiredDpas }),
      collectedBy: adminUserId,
      tags: ['dpa', 'automated', 'vendor-management'],
    },
  })
  created.push('DPA Status')

  // 5. Training completions
  const completions = await prisma.complianceTrainingCompletion.count({ where: { passed: true } })
  await prisma.complianceEvidence.create({
    data: {
      evidenceType: 'automated',
      title: 'Training Completion Count',
      description: `${completions} compliance training modules completed with passing scores.`,
      content: JSON.stringify({ passedCompletions: completions }),
      collectedBy: adminUserId,
      tags: ['training', 'automated', 'completions'],
    },
  })
  created.push('Training Completions')

  // 6. Incident resolution
  const resolvedIncidents = await prisma.ferpaIncident.count({ where: { status: 'resolved' } })
  const openIncidents = await prisma.ferpaIncident.count({ where: { status: { not: 'resolved' } } })
  await prisma.complianceEvidence.create({
    data: {
      requirementId: ferpaReq?.id || null,
      evidenceType: 'automated',
      title: 'Incident Resolution Status',
      description: `${resolvedIncidents} resolved incidents; ${openIncidents} open.`,
      content: JSON.stringify({ resolvedIncidents, openIncidents }),
      collectedBy: adminUserId,
      tags: ['incidents', 'automated', 'resolution-status'],
    },
  })
  created.push('Incident Resolution Status')

  return { created, count: created.length }
}
