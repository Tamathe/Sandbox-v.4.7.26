import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getTemplates } from '../../../../lib/ai-literacy/pack-template-service'
import type { DisciplineFamily, AITier, PackAssignmentType } from '../../../../generated/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const sp = req.nextUrl.searchParams
  const filters = {
    discipline: sp.get('discipline') as DisciplineFamily | undefined,
    tier: sp.get('tier') as AITier | undefined,
    type: sp.get('type') as PackAssignmentType | undefined,
    search: sp.get('search') ?? undefined,
    page: sp.has('page') ? Number(sp.get('page')) : undefined,
    pageSize: sp.has('pageSize') ? Number(sp.get('pageSize')) : undefined,
  }

  const result = await getTemplates(filters)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
