/**
 * GET /api/campus/orgs
 *
 * Search and browse campus organizations (from BBNvolved sync).
 *
 * Query params:
 *   q        — free-text search (name + summary)
 *   category — filter by category name (e.g. "Greek", "Service/Volunteer")
 *   page     — page number (1-based, default 1)
 *   limit    — results per page (default 24, max 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '../../../lib/api-utils';
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth';
import { prisma } from '../../../lib/prisma';
import { imageUrl, orgUrl } from '../../../lib/campuslabs';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req);
  if (isAuthFailure(auth)) return auth.response;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '24', 10)));
  const skip = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: 'Active', visibility: 'Public' };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.categoryNames = { has: category };
  }

  const [orgs, total] = await Promise.all([
    prisma.campusOrg.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        externalId: true,
        name: true,
        shortName: true,
        websiteKey: true,
        summary: true,
        profilePicture: true,
        categoryNames: true,
      },
    }),
    prisma.campusOrg.count({ where }),
  ]);

  return NextResponse.json({
    orgs: orgs.map((o) => ({
      ...o,
      imageUrl: imageUrl(o.profilePicture),
      engageUrl: orgUrl(o.websiteKey),
    })),
    total,
    page,
    pageCount: Math.ceil(total / limit),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  });
});
