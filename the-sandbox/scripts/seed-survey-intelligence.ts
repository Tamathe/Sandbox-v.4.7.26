/**
 * Seed script for Survey Intelligence.
 * Run: npx tsx scripts/seed-survey-intelligence.ts
 */
import 'dotenv/config'
import { seedSurveyIntelligence } from '../app/lib/staff/survey-intelligence-seed-data'

async function main() {
  await seedSurveyIntelligence()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
