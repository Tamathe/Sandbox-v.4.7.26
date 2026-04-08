/**
 * GET /api/campus/events
 *
 * Search and browse campus events (from BBNvolved sync).
 *
 * Query params:
 *   q        — free-text search (name + organizationName)
 *   theme    — filter by theme (e.g. "Social", "ThoughtfulLearning")
 *   category — filter by category name
 *   benefit  — filter by benefit (e.g. "Free Food", "Credit")
 *   orgId    — filter by CampusOrg externalId
 *   upcoming — "true" (default) to only show future events
 *   page     — page number (1-based, default 1)
 *   limit    — results per page (default 24, max 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '../../../lib/api-utils';
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth';
import { prisma } from '../../../lib/prisma';
import { imageUrl, ENGAGE_BASE } from '../../../lib/campuslabs';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? '';
  const theme = searchParams.get('theme') ?? '';
  const category = searchParams.get('category') ?? '';
  const benefit = searchParams.get('benefit') ?? '';
  const orgId = searchParams.get('orgId') ?? '';
  const upcoming = searchParams.get('upcoming') !== 'false';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '24', 10)));
  const skip = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: 'Approved', visibility: 'Public' };

  if (upcoming) {
    where.endsOn = { gte: new Date() };
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { organizationName: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (theme) where.theme = theme;
  if (category) where.categoryNames = { has: category };
  if (benefit) where.benefitNames = { has: benefit };
  if (orgId) where.orgExternalId = orgId;

  const [events, total] = await Promise.all([
    prisma.campusEvent.findMany({
      where,
      orderBy: { startsOn: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        externalId: true,
        name: true,
        description: true,
        location: true,
        startsOn: true,
        endsOn: true,
        imagePath: true,
        theme: true,
        categoryNames: true,
        benefitNames: true,
        organizationName: true,
        orgExternalId: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.campusEvent.count({ where }),
  ]);

  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      imageUrl: imageUrl(e.imagePath),
      engageUrl: `${ENGAGE_BASE}/event/${e.externalId}`,
      description: stripHtmlTruncate(e.description, 300),
    })),
    total,
    page,
    pageCount: Math.ceil(total / limit),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  });
});

function stripHtmlTruncate(html: string, max: number): string {
  const plain = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max) + '…' : plain;
}
