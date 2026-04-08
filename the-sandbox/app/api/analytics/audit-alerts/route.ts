/**
 * GET  /api/analytics/audit-alerts  — list open alerts for a course
 * PATCH /api/analytics/audit-alerts  — resolve an alert
 *
 * GET query params:
 *   courseId (required)
 *
 * PATCH body:
 *   { id: string, resolvedBy: string }
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { generateAlertNarratives } from '../../../lib/curriculum-audit'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const courseId = request.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const alerts = await prisma.curriculumAuditAlert.findMany({
    where: { courseId, resolvedAt: null },
    orderBy: [
      // HIGH severity first
      { severity: 'asc' },  // HIGH < LOW < MEDIUM alphabetically — use manual sort below
      { createdAt: 'desc' },
    ],
    include: {
      objective: { select: { id: true, title: true } },
      tool: { select: { id: true, name: true } },
    },
  })

  // Sort HIGH → MEDIUM → LOW (alphabetical ordering gives MEDIUM < HIGH which is wrong)
  const SEVERITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  alerts.sort((a, b) => {
    const diff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
    if (diff !== 0) return diff
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  // Generate missing narratives on-demand for any alert with empty narrative
  const missingNarrative = alerts
    .filter((a) => !a.narrative || a.narrative.trim() === '')
    .map((a) => a.id)

  if (missingNarrative.length > 0) {
    // Fire-and-forget in batches of ≤8 — don't block the response
    void (async () => {
      for (let i = 0; i < missingNarrative.length; i += 8) {
        await generateAlertNarratives(missingNarrative.slice(i, i + 8))
      }
    })()
  }

  return NextResponse.json({ alerts }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{ id?: string; resolvedBy?: string }>(request)
  if ('error' in parsed) return parsed.error

  const { id, resolvedBy } = parsed.data
  if (!id || !resolvedBy) {
    return NextResponse.json({ error: 'id and resolvedBy are required' }, { status: 400 })
  }

  const updated = await prisma.curriculumAuditAlert.update({
    where: { id },
    data: { resolvedAt: new Date(), resolvedBy },
  })

  return NextResponse.json({ alert: updated }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
