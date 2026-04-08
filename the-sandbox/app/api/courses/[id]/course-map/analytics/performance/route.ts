/**
 * POST /api/courses/[id]/course-map/analytics/performance
 *   — Accepts a batch of client-side performance metrics.
 *
 * GET /api/courses/[id]/course-map/analytics/performance
 *   — Returns aggregated performance data stored for the course map.
 *
 * Auth: requireCourseOwner
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'

// In-memory store keyed by courseId (sufficient for demo; production would use DB/Redis)
const perfStore = new Map<
  string,
  {
    renders: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number }>
    api: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number; errorRate: number }>
    webVitals: { lcp: number | null; fid: number | null; cls: number | null }
    updatedAt: string
  }
>()

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { renders, api, webVitals } = parsed.data as {
    renders?: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number }>
    api?: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number; errorRate: number }>
    webVitals?: { lcp: number | null; fid: number | null; cls: number | null }
  }

  perfStore.set(courseId, {
    renders: renders ?? {},
    api: api ?? {},
    webVitals: webVitals ?? { lcp: null, fid: null, cls: null },
    updatedAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const data = perfStore.get(courseId) ?? {
    renders: {},
    api: {},
    webVitals: { lcp: null, fid: null, cls: null },
    updatedAt: null,
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
