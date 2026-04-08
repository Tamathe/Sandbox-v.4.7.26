/**
 * PATCH /api/analytics/interventions/[id]
 *
 * Body: { outcome?: string; resolvedAt?: string }
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const runtime = 'nodejs'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { outcome, resolvedAt } = parsed.data as {
    outcome?: string
    resolvedAt?: string
  }

  const existing = await prisma.interventionLog.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })
  }

  const updated = await prisma.interventionLog.update({
    where: { id },
    data: {
      ...(outcome !== undefined ? { outcome } : {}),
      ...(resolvedAt !== undefined ? { resolvedAt: new Date(resolvedAt) } : {}),
      updatedAt: new Date(),
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(updated)
})
