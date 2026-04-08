import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../lib/server-auth'
import { getKnowledgeGraph } from '../../../lib/uknow-insights-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const college = searchParams.get('college') || undefined
  const days = parseInt(searchParams.get('days') ?? '90', 10)
  const limit = parseInt(searchParams.get('limit') ?? '40', 10)

  const graph = await getKnowledgeGraph({ college, days, limit })
  return NextResponse.json(graph, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
