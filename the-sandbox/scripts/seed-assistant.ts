import 'dotenv/config'
import { seedAssistantData } from '../app/lib/assistant/seed-data'

async function main() {
  console.log('Seeding assistant data...')
  const result = await seedAssistantData()
  console.log('Done:', JSON.stringify(result))
  process.exit(0)
}

main().catch(e => {
  console.error('Seed failed:', e)
  process.exit(1)
})
