/**
 * GET /api/analytics/concept-mastery
 *
 * Returns concept mastery data with decay applied.
 * - STUDENT: own data only
 * - EDUCATOR / ADMIN: can pass ?userId= to view any student
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getConceptMasteries } from '../../../lib/concept-mastery-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  let targetUserId = user.id

  if (user.role === 'EDUCATOR' || user.role === 'ADMIN') {
    const requestedUserId = req.nextUrl.searchParams.get('userId')
    if (requestedUserId) targetUserId = requestedUserId
  } else if (user.role === 'STUDENT') {
    // Students can only see their own data
    targetUserId = user.id
  }

  const masteries = await getConceptMasteries(targetUserId)
  return NextResponse.json({ masteries, userId: targetUserId }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
