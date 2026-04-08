import 'dotenv/config'
import { seedCommitteeData } from '../app/lib/staff/committee-seed-data'

async function main() {
  console.log('Seeding committee data...')
  await seedCommitteeData()
  console.log('Done')
  process.exit(0)
}

main().catch(e => {
  console.error('Seed failed:', e)
  process.exit(1)
})
