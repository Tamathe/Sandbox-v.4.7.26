/**
 * PUT /api/sandcastle/feature-flags/[flagId]
 *
 * Updates a feature flag's enabled state and optional rollout percent.
 * Invalidates Redis cache key feature:flags:{flagId} if Redis is available.
 * ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { redis } from '../../../../lib/redis'

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> },
) => {
  const auth = await requireRequestUser(request, { requireAdmin: true })
  if (isAuthFailure(auth)) return auth.response

  const { flagId } = await params
  const parsed = await parseRequestBody<{ enabled?: boolean; rolloutPercent?: number }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled (boolean) is required' }, { status: 400 })
  }

  const flag = await prisma.roomFeatureFlag.findUnique({ where: { id: flagId } })
  if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 })

  const updated = await prisma.roomFeatureFlag.update({
    where: { id: flagId },
    data: {
      enabled: body.enabled,
      ...(typeof body.rolloutPercent === 'number'
        ? { rolloutPercent: Math.max(0, Math.min(100, body.rolloutPercent)) }
        : {}),
    },
  })

  // Invalidate Redis cache if available
  if (redis) {
    await redis.del(`feature:flags:${flagId}`).catch(() => undefined)
  }

  return NextResponse.json({ flag: updated })
})
