/**
 * Seed SACSCOC accreditation standards + initial cycle
 * Usage: npx tsx scripts/seed-accreditation-standards.ts
 */

import { prisma } from '../app/lib/prisma'
import { seedStandards } from '../app/lib/accreditation/standards-registry'

async function main() {
  console.log('[seed-accreditation] Seeding SACSCOC standards...')
  const { created } = await seedStandards()
  console.log(`[seed-accreditation] ${created} standards seeded`)

  // Create default accreditation cycle if none exists
  const existingCycle = await prisma.accreditationCycle.findFirst({
    where: { isActive: true },
  })

  if (!existingCycle) {
    const standards = await prisma.accreditationStandard.count({ where: { isActive: true } })

    const cycle = await prisma.accreditationCycle.create({
      data: {
        body: 'SACSCOC',
        cycleName: '2024-2034 Reaffirmation Cycle',
        cycleStartDate: new Date('2024-01-01'),
        cycleEndDate: new Date('2034-12-31'),
        siteVisitDate: new Date('2033-10-15'),
        selfStudyDue: new Date('2033-03-01'),
        phase: 'MAINTENANCE',
        standardsTotal: standards,
        isActive: true,
      },
    })
    console.log(`[seed-accreditation] Created cycle: ${cycle.cycleName} (${cycle.id})`)
  } else {
    console.log(`[seed-accreditation] Active cycle already exists: ${existingCycle.cycleName}`)
  }

  console.log('[seed-accreditation] Done!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
