import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getStanceDistribution } from '../../../../lib/stance-service'
import type { DisciplineFamily } from '../../../../generated/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const disciplineFamily = req.nextUrl.searchParams.get('disciplineFamily') as DisciplineFamily | null
  const result = await getStanceDistribution(disciplineFamily ?? undefined)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
