// GET /api/tools/[id]/insights?courseId=&since=
// Returns AI-generated class-wide insights for a tool.
// Guarded by requireToolOwner — only the tool creator (or an ADMIN) may access.
// Results are cached in-process for 1 hour to avoid repeated Sonnet calls.

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireToolOwner, isAuthFailure } from '../../../../lib/server-auth'
import { generateToolInsights, type ToolInsight } from '../../../../lib/insight-service'
import { prisma } from '../../../../lib/prisma'

// ── In-memory cache (module-level, survives across requests in the same worker) ─
type CacheEntry = { data: ToolInsight; expiresAt: number }
const insightCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000   // 1 hour

function getCached(key: string): ToolInsight | null {
  const entry = insightCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { insightCache.delete(key); return null }
  return entry.data
}

function setCached(key: string, data: ToolInsight): void {
  insightCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: toolId } = await params

  const auth = await requireToolOwner(req, toolId)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId') || null

  // Default window: last 90 days
  const sinceParam = searchParams.get('since')
  const since = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  if (isNaN(since.getTime())) {
    return NextResponse.json({ error: 'Invalid since date' }, { status: 400 })
  }

  const cacheKey = `${toolId}:${courseId ?? '_'}:${since.toISOString().slice(0, 10)}`
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  }

  try {
    // Run AI insights + session quality DB query in parallel
    const [insight, sessions] = await Promise.all([
      generateToolInsights(toolId, courseId, since),
      prisma.toolSession.findMany({
        where: {
          toolId,
          sensitiveSession: false,
          startedAt: { gte: since },
          ...(courseId ? { courseId } : {}),
        },
        select: { durationSeconds: true, hintCount: true, exitReason: true, conceptsTouched: true },
      }),
    ])

    // Compute session quality aggregates
    const durSessions = sessions.filter(s => s.durationSeconds != null)
    const avgDurationMinutes = durSessions.length > 0
      ? Math.round(durSessions.reduce((sum, s) => sum + s.durationSeconds!, 0) / durSessions.length / 60)
      : null
    const hintSessions = sessions.filter(s => s.hintCount != null)
    const avgHintCount = hintSessions.length > 0
      ? Math.round((hintSessions.reduce((sum, s) => sum + s.hintCount!, 0) / hintSessions.length) * 10) / 10
      : null
    const withExitReason = sessions.filter(s => s.exitReason != null)
    const completionRate = withExitReason.length > 0
      ? Math.round(withExitReason.filter(s => s.exitReason === 'completed').length / withExitReason.length * 100)
      : null
    const abandonRate = withExitReason.length > 0
      ? Math.round(withExitReason.filter(s => s.exitReason === 'abandoned').length / withExitReason.length * 100)
      : null
    const topConcepts = [...new Set(sessions.flatMap(s => s.conceptsTouched ?? []))].slice(0, 5)

    const sessionQuality = { avgDurationMinutes, avgHintCount, completionRate, abandonRate, topConcepts }

    setCached(cacheKey, insight)
    return NextResponse.json({ ...insight, sessionQuality }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('[insights] generation failed', err)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
})
