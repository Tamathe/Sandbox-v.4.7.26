/**
 * Seed script for Starter Pack v2 templates.
 *
 * Reads all assignment and checkpoint template data from the library files
 * and upserts them into StarterPackTemplate / CheckpointTemplate tables.
 *
 * Idempotent — safe to run multiple times.
 *
 * Usage: npx tsx scripts/seed-pack-templates.ts
 */

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'
import type { DisciplineFamily, AITier, AIStance, PackAssignmentType } from '../app/generated/prisma'

import { STEM_ASSIGNMENTS } from '../app/lib/ai-literacy/templates/stem'
import { HUMANITIES_ASSIGNMENTS } from '../app/lib/ai-literacy/templates/humanities'
import { SOCIAL_SCIENCES_ASSIGNMENTS } from '../app/lib/ai-literacy/templates/social-sciences'
import { ARTS_ASSIGNMENTS } from '../app/lib/ai-literacy/templates/arts'
import { PROFESSIONAL_ASSIGNMENTS } from '../app/lib/ai-literacy/templates/professional'
import { HEALTH_SCIENCES_ASSIGNMENTS } from '../app/lib/ai-literacy/templates/health-sciences'
import { CHECKPOINTS_GROUP1 } from '../app/lib/ai-literacy/templates/checkpoints-group1'
import { CHECKPOINTS_GROUP2 } from '../app/lib/ai-literacy/templates/checkpoints-group2'

// ─── Combine all templates ──────────────────────────────────────────────────

const ALL_ASSIGNMENTS = [
  ...STEM_ASSIGNMENTS,
  ...HUMANITIES_ASSIGNMENTS,
  ...SOCIAL_SCIENCES_ASSIGNMENTS,
  ...ARTS_ASSIGNMENTS,
  ...PROFESSIONAL_ASSIGNMENTS,
  ...HEALTH_SCIENCES_ASSIGNMENTS,
]

const ALL_CHECKPOINTS = [
  ...CHECKPOINTS_GROUP1,
  ...CHECKPOINTS_GROUP2,
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute sortOrder per discipline (0-based index within each discipline group). */
function buildSortOrders<T extends { disciplineFamily: string }>(items: T[]): number[] {
  const counters: Record<string, number> = {}
  return items.map((item) => {
    const key = item.disciplineFamily
    counters[key] = (counters[key] ?? 0)
    return counters[key]++
  })
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding Starter Pack v2 templates...\n')

  // ── Assignment templates ────────────────────────────────────────────────
  const assignmentSortOrders = buildSortOrders(ALL_ASSIGNMENTS)
  let assignmentCount = 0

  for (let i = 0; i < ALL_ASSIGNMENTS.length; i++) {
    const t = ALL_ASSIGNMENTS[i]
    const sortOrder = assignmentSortOrders[i]

    const existing = await prisma.starterPackTemplate.findFirst({
      where: {
        disciplineFamily: t.disciplineFamily as DisciplineFamily,
        title: t.title,
      },
    })

    const data = {
      disciplineFamily: t.disciplineFamily as DisciplineFamily,
      title: t.title,
      description: t.description,
      assignmentType: t.assignmentType as PackAssignmentType,
      aiTier: t.aiTier as AITier,
      aiLevel: t.aiLevel as AIStance,
      syllabusLanguage: t.syllabusLanguage,
      rubricRows: t.rubricRows as any,
      implementationNotes: t.implementationNotes,
      documentationTemplate: t.documentationTemplate,
      tags: t.tags,
      sortOrder,
    }

    if (existing) {
      await prisma.starterPackTemplate.update({
        where: { id: existing.id },
        data,
      })
    } else {
      await prisma.starterPackTemplate.create({ data })
    }

    assignmentCount++
  }

  console.log(`Seeded ${assignmentCount} assignment templates`)

  // ── Checkpoint templates ────────────────────────────────────────────────
  const checkpointSortOrders = buildSortOrders(ALL_CHECKPOINTS)
  let checkpointCount = 0

  for (let i = 0; i < ALL_CHECKPOINTS.length; i++) {
    const t = ALL_CHECKPOINTS[i]
    const sortOrder = checkpointSortOrders[i]

    const existing = await prisma.checkpointTemplate.findFirst({
      where: {
        disciplineFamily: t.disciplineFamily as DisciplineFamily,
        name: t.name,
      },
    })

    const data = {
      disciplineFamily: t.disciplineFamily as DisciplineFamily,
      name: t.name,
      description: t.description,
      gradingWeight: t.gradingWeight,
      aiTier: t.aiTier as AITier,
      sortOrder,
    }

    if (existing) {
      await prisma.checkpointTemplate.update({
        where: { id: existing.id },
        data,
      })
    } else {
      await prisma.checkpointTemplate.create({ data })
    }

    checkpointCount++
  }

  console.log(`Seeded ${checkpointCount} checkpoint templates`)
  console.log('\nDone!')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
