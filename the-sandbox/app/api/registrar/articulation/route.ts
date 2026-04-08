import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const minScoreRaw = searchParams.get('minScore')
  const maxScoreRaw = searchParams.get('maxScore')
  const minScore = minScoreRaw !== null && !isNaN(Number(minScoreRaw)) ? Number(minScoreRaw) : undefined
  const maxScore = maxScoreRaw !== null && !isNaN(Number(maxScoreRaw)) ? Number(maxScoreRaw) : undefined

  type WhereClause = import('../../../generated/prisma').Prisma.ArticulationRequestWhereInput
  const where: WhereClause = {}
  if (status) where.status = status as import('../../../generated/prisma').ArticulationStatus
  if (minScore !== undefined || maxScore !== undefined) {
    where.similarityScore = { gte: minScore, lte: maxScore }
  }

  const requests = await prisma.articulationRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ requests }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
