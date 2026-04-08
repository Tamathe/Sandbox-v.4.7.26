/**
 * GET /api/analytics/transfer-explorer
 *
 * Returns incoming concept transfer events for a course.
 * Requires EDUCATOR or ADMIN role.
 * Query param: courseId (required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getTransferExplorerData } from '../../../lib/transfer-explorer-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req, { requireEducator: true })
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const result = await getTransferExplorerData(courseId)
  return NextResponse.json({ ...result, courseId }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
