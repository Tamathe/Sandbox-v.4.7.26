import 'dotenv/config'
import { prisma } from '../app/lib/prisma'
import { JUDGMENT_CALL_SCENARIOS } from '../app/lib/ai-literacy/judgment-calls-seed-data'

async function main() {
  console.log('Seeding judgment call scenarios...')

  for (const scenario of JUDGMENT_CALL_SCENARIOS) {
    const existing = await prisma.judgmentCallScenario.findFirst({
      where: { title: scenario.title },
    })

    if (existing) {
      await prisma.judgmentCallScenario.update({
        where: { id: existing.id },
        data: {
          description: scenario.description,
          category: scenario.category,
          disciplineFamily: scenario.disciplineFamily,
          difficulty: scenario.difficulty,
          scenarioTree: JSON.parse(JSON.stringify(scenario.scenarioTree)),
        },
      })
      console.log(`  Updated: ${scenario.title}`)
    } else {
      await prisma.judgmentCallScenario.create({
        data: {
          title: scenario.title,
          description: scenario.description,
          category: scenario.category,
          disciplineFamily: scenario.disciplineFamily,
          difficulty: scenario.difficulty,
          scenarioTree: JSON.parse(JSON.stringify(scenario.scenarioTree)),
        },
      })
      console.log(`  Created: ${scenario.title}`)
    }
  }

  console.log(`Done — ${JUDGMENT_CALL_SCENARIOS.length} scenarios seeded`)
  process.exit(0)
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
