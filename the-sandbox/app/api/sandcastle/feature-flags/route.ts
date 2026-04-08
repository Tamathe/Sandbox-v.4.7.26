/**
 * GET /api/sandcastle/feature-flags
 *
 * Returns all Sandcastle feature flag records.
 * Seeds the 4 defaults on first access.
 * ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

const DEFAULT_FLAGS = [
  { feature: 'pollInsights', enabled: true, rolloutPercent: 100 },
  { feature: 'canvasCritique', enabled: false, rolloutPercent: 0 },
  { feature: 'buzzerAi', enabled: false, rolloutPercent: 0 },
  { feature: 'seminarTranscript', enabled: false, rolloutPercent: 0 },
]

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request, { requireAdmin: true })
  if (isAuthFailure(auth)) return auth.response

  // Seed defaults on first access
  await prisma.roomFeatureFlag.createMany({ data: DEFAULT_FLAGS, skipDuplicates: true })

  const flags = await prisma.roomFeatureFlag.findMany({ orderBy: { feature: 'asc' } })
  return NextResponse.json({ flags }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
