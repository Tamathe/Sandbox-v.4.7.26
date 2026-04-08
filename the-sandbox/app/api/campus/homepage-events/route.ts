/**
 * GET /api/campus/homepage-events
 *
 * Returns upcoming campus events formatted for the student homepage
 * CampusLife widget. Prioritizes: happening now > today > free food > this week.
 * Falls back gracefully if no synced data exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '../../../lib/api-utils';
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth';
import { prisma } from '../../../lib/prisma';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // Fetch events in priority tiers
  const [happeningNow, today, thisWeek] = await Promise.all([
    // Tier 1: happening right now
    prisma.campusEvent.findMany({
      where: {
        startsOn: { lte: now },
        endsOn: { gte: now },
        status: 'Approved',
      },
      orderBy: { endsOn: 'asc' },
      take: 3,
      select: eventSelect,
    }),
    // Tier 2: later today
    prisma.campusEvent.findMany({
      where: {
        startsOn: { gt: now, lte: endOfToday },
        status: 'Approved',
      },
      orderBy: { startsOn: 'asc' },
      take: 6,
      select: eventSelect,
    }),
    // Tier 3: rest of the week
    prisma.campusEvent.findMany({
      where: {
        startsOn: { gt: endOfToday, lte: endOfWeek },
        status: 'Approved',
      },
      orderBy: { startsOn: 'asc' },
      take: 10,
      select: eventSelect,
    }),
  ]);

  // Merge + dedupe, prioritizing free food within each tier
  const seen = new Set<string>();
  const items: HomepageEvent[] = [];

  function addEvents(events: typeof happeningNow, tier: 'now' | 'today' | 'week') {
    // Sort free food first within tier
    const sorted = [...events].sort((a, b) => {
      const aFood = a.benefitNames.includes('Free Food') ? 0 : 1;
      const bFood = b.benefitNames.includes('Free Food') ? 0 : 1;
      return aFood - bFood;
    });
    for (const ev of sorted) {
      if (seen.has(ev.externalId)) continue;
      seen.add(ev.externalId);
      items.push(formatEvent(ev, tier, now));
    }
  }

  addEvents(happeningNow, 'now');
  addEvents(today, 'today');
  addEvents(thisWeek, 'week');

  // Get total count for "See all X events" CTA
  const totalUpcoming = await prisma.campusEvent.count({
    where: { endsOn: { gte: now }, status: 'Approved' },
  });

  return NextResponse.json({
    items: items.slice(0, 6),
    totalUpcoming,
    synced: items.length > 0,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const eventSelect = {
  externalId: true,
  name: true,
  location: true,
  startsOn: true,
  endsOn: true,
  theme: true,
  benefitNames: true,
  organizationName: true,
  description: true,
} as const;

interface HomepageEvent {
  id: string;
  type: 'event' | 'dining' | 'athletics' | 'career';
  title: string;
  subtitle: string;
  time: string;
  location?: string;
  badge?: string;
  badgeColor?: string;
  href: string;
}

function inferType(ev: { theme: string | null; benefitNames: string[]; name: string }): HomepageEvent['type'] {
  if (ev.theme === 'Athletics') return 'athletics';
  if (ev.benefitNames.includes('Free Food')) return 'dining';
  const lower = ev.name.toLowerCase();
  if (lower.includes('career') || lower.includes('networking') || lower.includes('resume') || lower.includes('interview')) return 'career';
  return 'event';
}

function formatEvent(
  ev: {
    externalId: string;
    name: string;
    location: string | null;
    startsOn: Date;
    endsOn: Date;
    theme: string | null;
    benefitNames: string[];
    organizationName: string;
    description: string;
  },
  tier: 'now' | 'today' | 'week',
  now: Date,
): HomepageEvent {
  const type = inferType(ev);
  const start = ev.startsOn;
  const end = ev.endsOn;

  // Build time string
  let time: string;
  if (tier === 'now') {
    const minsLeft = Math.round((end.getTime() - now.getTime()) / 60000);
    time = minsLeft < 60
      ? `Happening now · ${minsLeft}m left`
      : `Happening now · ends ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (tier === 'today') {
    time = `Today, ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else {
    const day = start.toLocaleDateString('en-US', { weekday: 'short' });
    time = `${day}, ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  // Build subtitle
  const orgPart = ev.organizationName;
  const descPlain = ev.description
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  const subtitle = descPlain ? `${orgPart} · ${descPlain}` : orgPart;

  // Build badge
  let badge: string | undefined;
  let badgeColor: string | undefined;
  if (tier === 'now') {
    badge = 'NOW';
    badgeColor = 'bg-green-100 text-green-700';
  } else if (ev.benefitNames.includes('Free Food')) {
    badge = 'Free Food';
    badgeColor = 'bg-amber-100 text-amber-700';
  } else if (ev.benefitNames.includes('Credit')) {
    badge = 'Credit';
    badgeColor = 'bg-blue-100 text-blue-700';
  } else if (ev.theme) {
    badge = ev.theme === 'ThoughtfulLearning' ? 'Learning' : ev.theme;
    badgeColor = 'bg-purple-100 text-purple-700';
  }

  return {
    id: `bbnvolved-${ev.externalId}`,
    type,
    title: ev.name,
    subtitle,
    time,
    location: ev.location || undefined,
    badge,
    badgeColor,
    href: `/campus-life?tab=events&q=${encodeURIComponent(ev.name)}`,
  };
}
