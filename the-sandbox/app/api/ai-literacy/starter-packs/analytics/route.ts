import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const [
    totalPacks,
    byDiscipline,
    byStatus,
    byTier,
    implementations,
    ratings,
  ] = await Promise.all([
    prisma.customStarterPack.count(),
    prisma.customStarterPack.groupBy({
      by: ['disciplineFamily'],
      _count: { _all: true },
    }),
    prisma.customStarterPack.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.customPackItem.groupBy({
      by: ['customAiLevel'],
      _count: { _all: true },
    }),
    prisma.packImplementation.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.packImplementation.aggregate({
      where: { rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ])

  const toRecord = (groups: { _count: { _all: number } }[], key: string) => {
    const record: Record<string, number> = {}
    for (const g of groups) {
      record[(g as Record<string, unknown>)[key] as string ?? 'null'] = g._count._all
    }
    return record
  }

  return NextResponse.json({
    totalPacks,
    byDiscipline: toRecord(byDiscipline, 'disciplineFamily'),
    byStatus: toRecord(byStatus, 'status'),
    byTier: toRecord(byTier, 'customAiLevel'),
    implementationRate: toRecord(implementations, 'status'),
    avgRating: ratings._avg.rating,
    totalRatings: ratings._count.rating,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
