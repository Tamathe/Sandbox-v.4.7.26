import 'dotenv/config'
import pg from 'pg'

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  console.log('Connected to database')

  // Add new enum values to NotificationType
  for (const val of ['STAFF_ALERT_P0', 'STAFF_ALERT_INFO', 'TOOL_APPROVED']) {
    try {
      await client.query(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS '${val}'`)
      console.log(`Added enum value: ${val}`)
    } catch (e: unknown) {
      console.log(`${val} skipped:`, (e as Error).message)
    }
  }

  // Create UserNotificationPreference table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "UserNotificationPreference" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "channel" TEXT NOT NULL DEFAULT 'in_app',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
    )
  `)
  console.log('Created UserNotificationPreference table')

  // Add unique constraint
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "UserNotificationPreference_userId_type_key"
    ON "UserNotificationPreference"("userId", "type")
  `)
  console.log('Added unique index')

  // Add userId index
  await client.query(`
    CREATE INDEX IF NOT EXISTS "UserNotificationPreference_userId_idx"
    ON "UserNotificationPreference"("userId")
  `)
  console.log('Added userId index')

  // Add foreign key
  try {
    await client.query(`
      ALTER TABLE "UserNotificationPreference"
      ADD CONSTRAINT "UserNotificationPreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)
    console.log('Added foreign key')
  } catch (e: unknown) {
    console.log('FK skipped (already exists):', (e as Error).message)
  }

  await client.end()
  console.log('Migration complete!')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
