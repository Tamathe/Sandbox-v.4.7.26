/**
 * Manual trigger for campus data sync.
 * Usage: npx tsx scripts/sync-campus.ts
 */

import { runCampusSync } from '../app/lib/campus-sync-service';

async function main() {
  console.log('Starting campus sync…');
  const result = await runCampusSync();
  console.log('Sync complete:');
  console.log(`  Orgs upserted:       ${result.orgsUpserted}`);
  console.log(`  Events upserted:     ${result.eventsUpserted}`);
  console.log(`  Stale events deleted: ${result.staleEventsDeleted}`);
  console.log(`  Duration:            ${result.durationMs}ms`);
  if (result.errors.length > 0) {
    console.log(`  Errors:              ${result.errors.join(', ')}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
