import { prisma } from './prisma'

const VALID_REGULATIONS = ['FERPA', 'COPPA', 'GDPR', 'KY-PRIVACY', 'SACSCOC']
const VALID_STATUSES = ['met', 'partial', 'unmet', 'not-applicable']

export async function createRequirement(data: {
  regulation: string
  articleRef: string
  title: string
  description: string
  featureMapping: string[]
  status?: string
  notes?: string
}) {
  if (!VALID_REGULATIONS.includes(data.regulation)) throw new Error(`Invalid regulation: ${data.regulation}`)
  if (data.status && !VALID_STATUSES.includes(data.status)) throw new Error(`Invalid status: ${data.status}`)

  return prisma.regulatoryRequirement.create({
    data: {
      regulation: data.regulation,
      articleRef: data.articleRef,
      title: data.title,
      description: data.description,
      featureMapping: data.featureMapping,
      status: data.status ?? 'met',
      notes: data.notes,
    },
  })
}

export async function updateRequirement(
  id: string,
  data: { title?: string; description?: string; featureMapping?: string[]; status?: string; notes?: string },
) {
  if (data.status && !VALID_STATUSES.includes(data.status)) throw new Error(`Invalid status: ${data.status}`)
  return prisma.regulatoryRequirement.update({ where: { id }, data })
}

export async function listRequirements(regulation?: string) {
  return prisma.regulatoryRequirement.findMany({
    where: regulation ? { regulation } : undefined,
    orderBy: [{ regulation: 'asc' }, { articleRef: 'asc' }],
  })
}

export async function deleteRequirement(id: string) {
  return prisma.regulatoryRequirement.delete({ where: { id } })
}

export async function getComplianceMatrix() {
  const requirements = await prisma.regulatoryRequirement.findMany({
    orderBy: [{ regulation: 'asc' }, { articleRef: 'asc' }],
  })

  const grouped: Record<string, typeof requirements> = {}
  const counts: Record<string, { met: number; partial: number; unmet: number; na: number; total: number }> = {}

  for (const req of requirements) {
    if (!grouped[req.regulation]) {
      grouped[req.regulation] = []
      counts[req.regulation] = { met: 0, partial: 0, unmet: 0, na: 0, total: 0 }
    }
    grouped[req.regulation].push(req)
    counts[req.regulation].total++
    if (req.status === 'met') counts[req.regulation].met++
    else if (req.status === 'partial') counts[req.regulation].partial++
    else if (req.status === 'unmet') counts[req.regulation].unmet++
    else counts[req.regulation].na++
  }

  return { grouped, counts }
}

export async function getGapAnalysis() {
  return prisma.regulatoryRequirement.findMany({
    where: { status: { in: ['partial', 'unmet'] } },
    orderBy: [{ status: 'asc' }, { regulation: 'asc' }],
  })
}

// ── Seed representative requirements ────────────────────────────────────────

export async function seedRegulatoryRequirements() {
  const REQUIREMENTS = [
    // FERPA (5)
    { regulation: 'FERPA', articleRef: '34 CFR 99.3', title: 'Definition of Education Records', description: 'Platform must correctly classify which data constitutes education records under FERPA and apply appropriate protections.', featureMapping: ['sensitiveSession FERPA guard', 'compliance-service.ts erasure', 'FERPA training quiz'], status: 'met' },
    { regulation: 'FERPA', articleRef: '34 CFR 99.10', title: 'Right to Inspect and Review', description: 'Students must be able to inspect and review their education records. Platform must provide data export capabilities.', featureMapping: ['GDPR data export', '/settings/privacy page', 'compliance score breakdown'], status: 'met' },
    { regulation: 'FERPA', articleRef: '34 CFR 99.20', title: 'Right to Amend Records', description: 'Students may request amendment of records they believe are inaccurate or misleading.', featureMapping: ['Student profile editing', 'data export for review'], status: 'partial', notes: 'Amendment request workflow not yet formalized' },
    { regulation: 'FERPA', articleRef: '34 CFR 99.30', title: 'Prior Consent for Disclosure', description: 'Written consent required before disclosing personally identifiable information from education records.', featureMapping: ['ConsentBanner.tsx', 'UserConsentCategory model', 'consent version tracking'], status: 'met' },
    { regulation: 'FERPA', articleRef: '34 CFR 99.31', title: 'School Official Exception', description: 'Disclosure allowed to school officials with legitimate educational interest without consent.', featureMapping: ['Role-based access control', 'requireEducatorUser guards', 'compliance RBAC'], status: 'met' },
    // GDPR (4)
    { regulation: 'GDPR', articleRef: 'Art. 15', title: 'Right of Access', description: 'Data subjects have the right to obtain confirmation of processing and access to their personal data.', featureMapping: ['GDPR data export', '/settings/privacy page'], status: 'met' },
    { regulation: 'GDPR', articleRef: 'Art. 17', title: 'Right to Erasure', description: 'Data subjects have the right to have their personal data erased under certain conditions.', featureMapping: ['Right-to-erasure endpoint', 'compliance-service.ts eraseUserData'], status: 'met' },
    { regulation: 'GDPR', articleRef: 'Art. 25', title: 'Data Protection by Design', description: 'Technical and organizational measures ensuring data protection principles are embedded in processing.', featureMapping: ['Privacy Impact Assessment generator', 'DataRetentionPolicy model', 'consent categories'], status: 'met' },
    { regulation: 'GDPR', articleRef: 'Art. 35', title: 'Data Protection Impact Assessment', description: 'DPIA required for processing likely to result in high risk to rights and freedoms.', featureMapping: ['Privacy Impact Assessment generator', 'AI audit report generation'], status: 'met' },
    // COPPA (2)
    { regulation: 'COPPA', articleRef: '16 CFR 312.3', title: 'Parental Consent for Children Under 13', description: 'Verifiable parental consent required before collecting personal information from children under 13.', featureMapping: ['University platform — users are 18+'], status: 'not-applicable', notes: 'Platform serves university students (18+); COPPA not applicable but tracked for completeness' },
    { regulation: 'COPPA', articleRef: '16 CFR 312.5', title: 'Data Minimization for Children', description: 'Operators may not condition participation on disclosure of more information than reasonably necessary.', featureMapping: ['University platform — users are 18+'], status: 'not-applicable' },
    // KY-PRIVACY (2)
    { regulation: 'KY-PRIVACY', articleRef: 'KRS 61.931', title: 'Personal Information Security', description: 'Kentucky law requires reasonable security measures for personal information held by educational institutions.', featureMapping: ['Auth guards', 'FERPA training', 'compliance scoring', 'data retention policies'], status: 'met' },
    { regulation: 'KY-PRIVACY', articleRef: 'KRS 365.732', title: 'Breach Notification', description: 'Kentucky requires notification within 72 hours of discovering a security breach involving personal information.', featureMapping: ['FerpaIncident model', 'compliance notification system'], status: 'partial', notes: 'Incident tracking exists; automated breach notification workflow pending' },
    // SACSCOC (2)
    { regulation: 'SACSCOC', articleRef: 'CR 10.5', title: 'Admissions Policies and Practices', description: 'Institution publishes and follows admissions policies consistent with its mission.', featureMapping: ['Registrar Intelligence System', 'petition routing'], status: 'met' },
    { regulation: 'SACSCOC', articleRef: 'CR 12.1', title: 'Student Support Services', description: 'Institution provides appropriate academic and student support programs, services, and activities.', featureMapping: ['Student Services Hub', 'Campus Navigator', 'Sandy concierge', 'Study Buddy'], status: 'met' },
  ]

  for (const req of REQUIREMENTS) {
    await prisma.regulatoryRequirement.upsert({
      where: { id: `seed-${req.regulation}-${req.articleRef.replace(/\s/g, '-')}` },
      update: req,
      create: { id: `seed-${req.regulation}-${req.articleRef.replace(/\s/g, '-')}`, ...req },
    })
  }

  return REQUIREMENTS.length
}
