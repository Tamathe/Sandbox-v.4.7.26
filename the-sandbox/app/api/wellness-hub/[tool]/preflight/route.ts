import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getWellnessHubPreflight, type WellnessToolSlug } from '../../../../lib/wellness-hub-preflight'

type RouteContext = { params: Promise<{ tool: string }> }

export const GET = withErrorHandling(async (req: NextRequest, context: RouteContext) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { tool } = await context.params
  const preflight = await getWellnessHubPreflight(auth.user.id, tool as WellnessToolSlug)
  return NextResponse.json(preflight, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
