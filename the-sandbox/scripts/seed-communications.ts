import 'dotenv/config'
import { seedCommunicationData } from '../app/lib/staff/communication-seed-data'

async function main() {
  console.log('Seeding communication data...')
  await seedCommunicationData()
  console.log('Done')
  process.exit(0)
}

main().catch(e => {
  console.error('Seed failed:', e)
  process.exit(1)
})
