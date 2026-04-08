/**
 * Seed demo RecommendationDraft records for the faculty homepage.
 *
 * Usage: npx tsx scripts/seed-recommendation-drafts.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const SARAH_KIM_DRAFT = `Dear Admissions Committee,

I am writing to strongly recommend Sarah Kim for admission to your PhD program in Electrical Engineering and Computer Science at MIT. As Sarah's professor for TEK-100: Technology & Society at the University of Kentucky, I have had the pleasure of observing her exceptional academic abilities and research potential over the past year.

Sarah consistently demonstrates a rare combination of analytical rigor and creative thinking. Her final project on ethical AI deployment in healthcare settings was among the most sophisticated undergraduate works I have reviewed in my career. She approached the topic with both technical depth and genuine concern for societal impact — exactly the kind of scholar your program cultivates.

In class discussions, Sarah regularly drew connections between emerging technology trends and broader policy implications that surprised even me. Her ability to synthesize complex technical concepts and communicate them clearly to diverse audiences is a skill many graduate students struggle to develop.

I give Sarah my highest recommendation without reservation. She will be an outstanding addition to your program.

Sincerely,
Dr. Katie Thompson
Associate Professor of Engineering
University of Kentucky`

async function main() {
  // Find Katie Thompson's recommendation requests
  const katie = await prisma.user.findFirst({
    where: { email: 'katie.thompson@uky.edu' },
  })

  if (!katie) {
    console.log('Katie Thompson not found — skipping recommendation draft seed')
    return
  }

  const requests = await prisma.recommendationRequest.findMany({
    where: { facultyId: katie.id },
  })

  if (requests.length === 0) {
    console.log('No recommendation requests found for Katie — creating seeded requests + drafts')

    // Create the Sarah Kim recommendation with draft
    const sarahReq = await prisma.recommendationRequest.create({
      data: {
        facultyId: katie.id,
        studentName: 'Sarah Kim',
        studentEmail: 'sarah.kim@uky.edu',
        purpose: 'PhD program',
        targetOrg: 'MIT EECS',
        dueDate: new Date('2026-04-01T17:00:00-04:00'),
        status: 'IN_PROGRESS',
        draftContent: SARAH_KIM_DRAFT,
        source: 'sandy',
      },
    })

    await prisma.recommendationDraft.create({
      data: {
        recommendationId: sarahReq.id,
        content: SARAH_KIM_DRAFT,
        version: 2,
        wordCount: SARAH_KIM_DRAFT.split(/\s+/).filter(Boolean).length,
        sandySessionId: null,
      },
    })

    console.log(`  Created Sarah Kim recommendation + draft (v2, ${SARAH_KIM_DRAFT.split(/\s+/).filter(Boolean).length} words)`)

    // Create James Oduya (PENDING, no draft)
    await prisma.recommendationRequest.create({
      data: {
        facultyId: katie.id,
        studentName: 'James Oduya',
        purpose: 'Scholarship',
        targetOrg: 'UK Honors',
        dueDate: new Date('2026-04-15T17:00:00-04:00'),
        status: 'PENDING',
        source: 'simulated',
      },
    })
    console.log('  Created James Oduya recommendation (PENDING)')

    // Create Priya Patel (PENDING, no draft)
    await prisma.recommendationRequest.create({
      data: {
        facultyId: katie.id,
        studentName: 'Priya Patel',
        purpose: 'Internship',
        targetOrg: 'Google STEP',
        dueDate: new Date('2026-04-20T17:00:00-04:00'),
        status: 'PENDING',
        source: 'simulated',
      },
    })
    console.log('  Created Priya Patel recommendation (PENDING)')
  } else {
    // Upsert draft for the first IN_PROGRESS request
    const inProgressReq = requests.find((r) => r.status === 'IN_PROGRESS')
    if (inProgressReq) {
      await prisma.recommendationDraft.upsert({
        where: { recommendationId: inProgressReq.id },
        create: {
          recommendationId: inProgressReq.id,
          content: SARAH_KIM_DRAFT,
          version: 2,
          wordCount: SARAH_KIM_DRAFT.split(/\s+/).filter(Boolean).length,
        },
        update: {
          content: SARAH_KIM_DRAFT,
          version: 2,
          wordCount: SARAH_KIM_DRAFT.split(/\s+/).filter(Boolean).length,
        },
      })
      console.log(`  Upserted draft for ${inProgressReq.studentName} (${inProgressReq.id})`)
    } else {
      console.log('  No IN_PROGRESS requests found to attach a draft to')
    }
  }

  console.log('Done seeding recommendation drafts')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
