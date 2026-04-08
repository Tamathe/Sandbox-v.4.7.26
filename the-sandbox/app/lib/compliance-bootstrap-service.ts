import { prisma } from './prisma'
import { seedRegulatoryRequirements } from './regulatory-mapping-service'
import { seedBenchmarks } from './compliance-benchmark-service'
import { seedTemplates } from './compliance-template-service'
import { seedPlaybooks } from './incident-playbook-service'
import { seedClassifications } from './data-classification-service'

// ── Compliance System Bootstrap ─────────────────────────────────────────────
// One-click initialization that seeds all default compliance data.

type BootstrapResult = {
  seeded: {
    requirements: number
    benchmarks: number
    templates: number
    playbooks: number
    classifications: number
    retentionPolicies: number
  }
  alreadyExisted: string[]
}

async function seedRetentionPolicies(): Promise<{ created: number; existed: boolean }> {
  const existing = await prisma.dataRetentionPolicy.count()
  if (existing > 0) return { created: 0, existed: true }

  const defaults = [
    { policyName: 'Chat Message Retention', dataCategory: 'chat_messages', retentionDays: 365, action: 'delete', active: true },
    { policyName: 'User Memory Retention', dataCategory: 'user_memories', retentionDays: 730, action: 'anonymize', active: true },
    { policyName: 'Session Data Retention', dataCategory: 'session_data', retentionDays: 1095, action: 'archive', active: true },
  ]

  for (const policy of defaults) {
    await prisma.dataRetentionPolicy.create({ data: policy })
  }

  return { created: defaults.length, existed: false }
}

export async function bootstrapComplianceSystem(): Promise<BootstrapResult> {
  const alreadyExisted: string[] = []

  // Seed regulatory requirements
  let requirementsCount = 0
  try {
    const before = await prisma.regulatoryRequirement.count()
    await seedRegulatoryRequirements()
    const after = await prisma.regulatoryRequirement.count()
    requirementsCount = after - before
    if (before > 0) alreadyExisted.push('requirements')
  } catch {
    // Already seeded or partial — count existing
    requirementsCount = 0
    alreadyExisted.push('requirements')
  }

  // Seed benchmarks
  let benchmarksCount = 0
  try {
    const before = await prisma.complianceBenchmark.count()
    await seedBenchmarks()
    const after = await prisma.complianceBenchmark.count()
    benchmarksCount = after - before
    if (before > 0) alreadyExisted.push('benchmarks')
  } catch {
    benchmarksCount = 0
    alreadyExisted.push('benchmarks')
  }

  // Seed templates
  let templatesCount = 0
  try {
    const before = await prisma.complianceReportTemplate.count()
    await seedTemplates()
    const after = await prisma.complianceReportTemplate.count()
    templatesCount = after - before
    if (before > 0) alreadyExisted.push('templates')
  } catch {
    templatesCount = 0
    alreadyExisted.push('templates')
  }

  // Seed playbooks
  let playbooksCount = 0
  try {
    const before = await prisma.incidentPlaybook.count()
    await seedPlaybooks()
    const after = await prisma.incidentPlaybook.count()
    playbooksCount = after - before
    if (before > 0) alreadyExisted.push('playbooks')
  } catch {
    playbooksCount = 0
    alreadyExisted.push('playbooks')
  }

  // Seed classifications
  let classificationsCount = 0
  try {
    const before = await prisma.dataClassification.count()
    await seedClassifications()
    const after = await prisma.dataClassification.count()
    classificationsCount = after - before
    if (before > 0) alreadyExisted.push('classifications')
  } catch {
    classificationsCount = 0
    alreadyExisted.push('classifications')
  }

  // Seed retention policies
  const retentionResult = await seedRetentionPolicies()
  if (retentionResult.existed) alreadyExisted.push('retentionPolicies')

  return {
    seeded: {
      requirements: requirementsCount,
      benchmarks: benchmarksCount,
      templates: templatesCount,
      playbooks: playbooksCount,
      classifications: classificationsCount,
      retentionPolicies: retentionResult.created,
    },
    alreadyExisted,
  }
}
