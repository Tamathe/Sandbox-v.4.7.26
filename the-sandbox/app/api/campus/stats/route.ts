/**
 * GET /api/campus/stats
 *
 * Quick stats for the campus life dashboard header.
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

  const [totalOrgs, totalEvents, eventsToday, eventsThisWeek, categories] = await Promise.all([
    prisma.campusOrg.count({ where: { status: 'Active' } }),
    prisma.campusEvent.count({ where: { endsOn: { gte: now }, status: 'Approved' } }),
    prisma.campusEvent.count({
      where: {
        startsOn: { lte: endOfToday },
        endsOn: { gte: now },
        status: 'Approved',
      },
    }),
    prisma.campusEvent.count({
      where: {
        startsOn: { lte: endOfWeek },
        endsOn: { gte: now },
        status: 'Approved',
      },
    }),
    prisma.campusOrg.findMany({
      where: { status: 'Active' },
      select: { categoryNames: true },
    }),
  ]);

  // Count unique categories
  const catSet = new Set<string>();
  for (const org of categories) {
    for (const c of org.categoryNames) catSet.add(c);
  }

  return NextResponse.json({
    totalOrgs,
    totalEvents,
    eventsToday,
    eventsThisWeek,
    categoryCount: catSet.size,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  });
});
