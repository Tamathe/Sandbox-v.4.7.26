import 'dotenv/config'
import { seedPolicyDocuments } from '../app/lib/staff/policy-seed-data'

async function main() {
  console.log('Seeding policy documents...')
  await seedPolicyDocuments()
  console.log('Done')
  process.exit(0)
}

main().catch(e => {
  console.error('Seed failed:', e)
  process.exit(1)
})
