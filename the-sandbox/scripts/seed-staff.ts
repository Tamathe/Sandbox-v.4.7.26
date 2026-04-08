import 'dotenv/config'
import { seedStaffData } from '../app/lib/staff/staff-seed-data'

seedStaffData()
  .then(() => {
    console.log('[Staff Seed] Complete')
    process.exit(0)
  })
  .catch((e) => {
    console.error('[Staff Seed] Error:', e)
    process.exit(1)
  })
