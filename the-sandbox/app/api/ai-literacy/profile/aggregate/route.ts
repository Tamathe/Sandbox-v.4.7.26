import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { getReadinessBand } from '../../../../lib/progressive-profile-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const department = req.nextUrl.searchParams.get('department')
  const college = req.nextUrl.searchParams.get('college')

  // Build user filter for department/college
  const userFilter: Record<string, string> = {}
  if (department) userFilter.department = department
  if (college) userFilter.college = college
  const hasUserFilter = Object.keys(userFilter).length > 0

  // ── Dimension averages (materialized profiles only) ──
  const avgResult = await prisma.aILiteracyProfile.aggregate({
    _avg: {
      comfort: true,
      pedagogyAlignment: true,
      curiosity: true,
      ethicalAwareness: true,
      currentUsage: true,
      readiness: true,
    },
    _count: true,
    where: {
      profileMaterialized: true,
      ...(hasUserFilter ? { user: userFilter } : {}),
    },
  })

  const totalMaterialized = avgResult._count

  const dimensionAverages = {
    comfort: Math.round(avgResult._avg.comfort ?? 0),
    pedagogyAlignment: Math.round(avgResult._avg.pedagogyAlignment ?? 0),
    curiosity: Math.round(avgResult._avg.curiosity ?? 0),
    ethicalAwareness: Math.round(avgResult._avg.ethicalAwareness ?? 0),
    currentUsage: Math.round(avgResult._avg.currentUsage ?? 0),
    readiness: Math.round(avgResult._avg.readiness ?? 0),
  }

  // ── Readiness band distribution ──
  const materializedProfiles = await prisma.aILiteracyProfile.findMany({
    where: {
      profileMaterialized: true,
      ...(hasUserFilter ? { user: userFilter } : {}),
    },
    select: { readiness: true },
  })

  const readinessBandDistribution = { starting: 0, foundations: 0, confidence: 0, leading: 0 }
  for (const p of materializedProfiles) {
    const band = getReadinessBand(p.readiness)
    readinessBandDistribution[band.key as keyof typeof readinessBandDistribution]++
  }

  // ── Materialization funnel ──
  const funnelGroups = await prisma.aILiteracyProfile.groupBy({
    by: ['modulesCompleted'],
    _count: true,
    where: hasUserFilter ? { user: userFilter } : {},
  })

  let totalProfiles = 0
  let zeroModules = 0
  let oneModule = 0
  let materialized = 0

  for (const g of funnelGroups) {
    totalProfiles += g._count
    if (g.modulesCompleted === 0) zeroModules = g._count
    else if (g.modulesCompleted === 1) oneModule = g._count
    else materialized += g._count
  }

  return NextResponse.json({
    totalMaterialized,
    dimensionAverages,
    readinessBandDistribution,
    materializationFunnel: { totalProfiles, zeroModules, oneModule, materialized },
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
