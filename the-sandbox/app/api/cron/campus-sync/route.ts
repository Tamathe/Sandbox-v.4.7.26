/**
 * CRON: Campus Sync
 *
 * Pulls organizations and events from CampusLabs Engage (BBNvolved)
 * and upserts them into the database. Run daily.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '../../../lib/server-auth';
import { withErrorHandling } from '../../../lib/api-utils';
import { runCampusSync } from '../../../lib/campus-sync-service';

export const runtime = 'nodejs';
export const maxDuration = 120; // allow up to 2 min for full sync

export const POST = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request);
  if (cronError) return cronError;

  console.log('[cron/campus-sync] Starting campus sync…');
  const result = await runCampusSync();
  console.log(
    `[cron/campus-sync] Done: ${result.orgsUpserted} orgs, ${result.eventsUpserted} events, ${result.staleEventsDeleted} stale deleted (${result.durationMs}ms)`,
  );

  return NextResponse.json({ ok: true, ...result });
});
