import { NextRequest, NextResponse } from 'next/server'
import { getSharedGraphMap, checkShareRequiresCode } from '../../../../../../lib/syllabus-architect/sharing-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/public/[token]
 *
 * Public route — NO auth required.
 * Returns read-only graph data if token is valid.
 * If access code is set, requires ?code= query param.
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> },
) => {
  const { token } = await params

  if (!token || token.length !== 32) {
    return NextResponse.json({ error: 'Invalid share token' }, { status: 400 })
  }

  // First check if code is required
  const check = await checkShareRequiresCode(token)
  if (!check.found) {
    return NextResponse.json({ error: 'Shared map not found or link has been revoked' }, { status: 404 })
  }

  const code = req.nextUrl.searchParams.get('code') || undefined

  if (check.requiresCode && !code) {
    return NextResponse.json({ error: 'access_code_required', requiresCode: true }, { status: 403 })
  }

  const data = await getSharedGraphMap(token, code)
  if (!data) {
    if (check.requiresCode) {
      return NextResponse.json({ error: 'invalid_access_code', requiresCode: true }, { status: 403 })
    }
    return NextResponse.json({ error: 'Shared map not found' }, { status: 404 })
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
