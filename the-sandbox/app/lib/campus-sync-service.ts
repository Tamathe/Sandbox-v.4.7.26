/**
 * Campus Sync Service
 *
 * Pulls organizations and events from CampusLabs Engage and upserts
 * them into the CampusOrg / CampusEvent tables.
 */

import { prisma } from './prisma';
import {
  fetchAllOrgs,
  fetchUpcomingEvents,
  type RawCampusOrg,
  type RawCampusEvent,
} from './campuslabs';

// ── Strip HTML tags for plain-text fallback ──────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Organization Sync ────────────────────────────────────────────────────────

async function syncOrgBatch(orgs: RawCampusOrg[]): Promise<number> {
  const now = new Date();
  let upserted = 0;

  for (const org of orgs) {
    await prisma.campusOrg.upsert({
      where: { externalId: org.Id },
      create: {
        externalId: org.Id,
        name: org.Name,
        shortName: org.ShortName,
        websiteKey: org.WebsiteKey,
        description: org.Description || '',
        summary: org.Summary || stripHtml(org.Description || '').slice(0, 500),
        profilePicture: org.ProfilePicture,
        categoryNames: org.CategoryNames ?? [],
        status: org.Status,
        visibility: org.Visibility,
        syncedAt: now,
      },
      update: {
        name: org.Name,
        shortName: org.ShortName,
        websiteKey: org.WebsiteKey,
        description: org.Description || '',
        summary: org.Summary || stripHtml(org.Description || '').slice(0, 500),
        profilePicture: org.ProfilePicture,
        categoryNames: org.CategoryNames ?? [],
        status: org.Status,
        visibility: org.Visibility,
        syncedAt: now,
      },
    });
    upserted++;
  }

  return upserted;
}

async function syncEventBatch(events: RawCampusEvent[]): Promise<number> {
  const now = new Date();
  let upserted = 0;

  for (const ev of events) {
    // Only set orgExternalId if the org exists in our DB (FK constraint)
    const orgId = String(ev.organizationId);
    const orgExists = await prisma.campusOrg.findUnique({
      where: { externalId: orgId },
      select: { externalId: true },
    });

    const data = {
      name: ev.name,
      description: ev.description || '',
      location: ev.location || null,
      startsOn: new Date(ev.startsOn),
      endsOn: new Date(ev.endsOn),
      imagePath: ev.imagePath,
      theme: ev.theme || null,
      categoryNames: ev.categoryNames ?? [],
      benefitNames: ev.benefitNames ?? [],
      organizationName: ev.organizationName,
      orgExternalId: orgExists ? orgId : null,
      latitude: ev.latitude ? parseFloat(ev.latitude) : null,
      longitude: ev.longitude ? parseFloat(ev.longitude) : null,
      status: ev.status,
      visibility: ev.visibility,
      syncedAt: now,
    };

    await prisma.campusEvent.upsert({
      where: { externalId: ev.id },
      create: { externalId: ev.id, ...data },
      update: data,
    });
    upserted++;
  }

  return upserted;
}

// ── Cleanup stale events (ended > 30 days ago) ──────────────────────────────

async function cleanupStaleEvents(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const result = await prisma.campusEvent.deleteMany({
    where: { endsOn: { lt: cutoff } },
  });
  return result.count;
}

// ── Full Sync ────────────────────────────────────────────────────────────────

export interface SyncResult {
  orgsUpserted: number;
  eventsUpserted: number;
  staleEventsDeleted: number;
  durationMs: number;
  errors: string[];
}

export async function runCampusSync(): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let orgsUpserted = 0;
  let eventsUpserted = 0;

  // Sync orgs
  try {
    for await (const batch of fetchAllOrgs()) {
      orgsUpserted += await syncOrgBatch(batch);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Org sync failed';
    console.error('[campus-sync] Org sync error:', msg);
    errors.push(msg);
  }

  // Sync events
  try {
    for await (const batch of fetchUpcomingEvents()) {
      eventsUpserted += await syncEventBatch(batch);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Event sync failed';
    console.error('[campus-sync] Event sync error:', msg);
    errors.push(msg);
  }

  // Cleanup old events
  let staleEventsDeleted = 0;
  try {
    staleEventsDeleted = await cleanupStaleEvents();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stale cleanup failed';
    console.error('[campus-sync] Cleanup error:', msg);
    errors.push(msg);
  }

  return {
    orgsUpserted,
    eventsUpserted,
    staleEventsDeleted,
    durationMs: Date.now() - start,
    errors,
  };
}
