import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getGrowthComparison, getTopGrowthConcepts } from '../../../lib/reflect-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const concept = searchParams.get('concept')

  if (concept) {
    const growth = await getGrowthComparison(auth.user.id, concept)
    return NextResponse.json(growth, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const topGrowth = await getTopGrowthConcepts(auth.user.id)
  return NextResponse.json({ concepts: topGrowth }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
