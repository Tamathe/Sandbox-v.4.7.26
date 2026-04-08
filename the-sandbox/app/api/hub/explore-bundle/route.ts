// PERF-AUDIT (Sprint 4, 2026-04-04): Bundle approach is STILL OPTIMAL but has a
// future optimization opportunity. The route bundles 5 sources: community tools
// (public/cacheable), my departments (user-specific), featured departments
// (public/cacheable), personalized collections (user-specific), and recommendations
// (user-specific). The community tools and featured departments could theoretically
// be split into a separate public-cache endpoint with a longer TTL (s-maxage=600)
// since they're the same for all users. However, the added complexity of two requests
// + client-side merge isn't justified yet — SWR dedup means this bundle is only
// fetched once per navigation. Revisit if hub traffic grows significantly.
//
// ─── Hub/Explore Bundle ─────────────────────────────────────────
// GET /api/hub/explore-bundle
// Consolidates 5 individual API calls into one request.

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getMyDepartments, listDepartments } from '../../../lib/department-service'
import { getPersonalizedCollections } from '../../../lib/hub-personalization'
import { getRecommendations } from '../../../lib/hub-recommendations'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

const TOOL_CARD_SELECT = {
  id: true,
  name: true,
  shortDescription: true,
  category: true,
  toolType: true,
  thumbnailUrl: true,
  approvalStatus: true,
  isPortfolio: true,
  _count: { select: { sessions: true } },
} as const

async function getCommunityTools() {
  return prisma.tool.findMany({
    where: {
      toolType: 'PORTFOLIO',
      approvalStatus: 'APPROVED',
      published: true,
    },
    select: TOOL_CARD_SELECT,
    orderBy: { sessions: { _count: 'desc' } },
    take: 8,
  })
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const userId = user.id
  const role = user.role
  const college = (user as { college?: string | null }).college ?? null

  const [communityRes, myDeptsRes, featuredDeptsRes, collectionsRes, recsRes] =
    await Promise.allSettled([
      getCommunityTools(),
      getMyDepartments(userId),
      listDepartments({ featured: true, page: 1, pageSize: 20 }),
      getPersonalizedCollections(userId, role, college),
      getRecommendations(userId, role, college, 6),
    ])

  return NextResponse.json({
    communityTools: communityRes.status === 'fulfilled' ? communityRes.value : [],
    myDepartments: myDeptsRes.status === 'fulfilled' ? myDeptsRes.value : [],
    featuredDepartments: featuredDeptsRes.status === 'fulfilled'
      ? (featuredDeptsRes.value as { departments: unknown[] }).departments ?? []
      : [],
    collections: collectionsRes.status === 'fulfilled' ? collectionsRes.value : [],
    recommendations: recsRes.status === 'fulfilled' ? recsRes.value : [],
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})