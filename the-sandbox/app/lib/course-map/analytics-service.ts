/**
 * Course Map Real-time Analytics Service
 *
 * Aggregates live engagement metrics: edit counts, active users,
 * node-level heatmap data, and time-series activity.
 */

import { prisma } from '../prisma'
import { subDays, subHours, format, startOfDay, startOfHour } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RealtimeAnalytics {
  liveEditCount: number
  activeUserCount: number
  activeUsers: { userId: string; name: string; lastActiveAt: string }[]
  heatmap: NodeHeatmapEntry[]
  engagement: EngagementSummary
  timeSeries: TimeSeriesPoint[]
  timeSeriesRange: '24h' | '7d' | '30d'
}

export interface NodeHeatmapEntry {
  nodeId: string
  label: string
  editCount: number
  intensity: number // 0–1 normalized
}

export interface EngagementSummary {
  totalSessions: number
  avgSessionDurationMin: number
  editsPerSession: number
  uniqueEditors7d: number
}

export interface TimeSeriesPoint {
  timestamp: string
  edits: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rangeToDate(range: '24h' | '7d' | '30d'): Date {
  if (range === '24h') return subHours(new Date(), 24)
  if (range === '7d') return subDays(new Date(), 7)
  return subDays(new Date(), 30)
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Full real-time analytics payload for a course map.
 */
export async function getCourseMapRealtimeAnalytics(
  courseId: string,
  range: '24h' | '7d' | '30d' = '24h',
): Promise<RealtimeAnalytics> {
  const [heatmap, engagement, timeSeries, activeUsers, liveEditCount] = await Promise.all([
    getActiveUserHeatmap(courseId),
    getEngagementSummary(courseId),
    getEditTimeSeries(courseId, range),
    getRecentActiveUsers(courseId),
    getRecentEditCount(courseId),
  ])

  return {
    liveEditCount,
    activeUserCount: activeUsers.length,
    activeUsers,
    heatmap,
    engagement,
    timeSeries,
    timeSeriesRange: range,
  }
}

/**
 * Time-series data for edits over the given range.
 */
export async function getEditTimeSeries(
  courseId: string,
  range: '24h' | '7d' | '30d',
): Promise<TimeSeriesPoint[]> {
  const since = rangeToDate(range)

  const edits = await prisma.courseMapEdit.findMany({
    where: { courseId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  if (range === '24h') {
    // Bucket by hour
    const buckets = new Map<string, number>()
    for (let i = 23; i >= 0; i--) {
      const h = startOfHour(subHours(new Date(), i))
      buckets.set(format(h, "yyyy-MM-dd'T'HH:00"), 0)
    }
    for (const e of edits) {
      const key = format(startOfHour(e.createdAt), "yyyy-MM-dd'T'HH:00")
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1)
    }
    return [...buckets.entries()].map(([timestamp, editCount]) => ({ timestamp, edits: editCount }))
  }

  // Bucket by day for 7d/30d
  const days = range === '7d' ? 7 : 30
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), 0)
  }
  for (const e of edits) {
    const key = format(startOfDay(e.createdAt), 'yyyy-MM-dd')
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  return [...buckets.entries()].map(([timestamp, editCount]) => ({ timestamp, edits: editCount }))
}

/**
 * Node-level heatmap: which nodes get the most edits.
 * Returns normalized intensity (0–1) for color mapping.
 */
export async function getActiveUserHeatmap(courseId: string): Promise<NodeHeatmapEntry[]> {
  const edits = await prisma.courseMapEdit.findMany({
    where: { courseId },
    select: { payload: true },
  })

  const nodeCounts = new Map<string, { label: string; count: number }>()
  for (const edit of edits) {
    const payload = edit.payload as Record<string, unknown> | null
    const nodeId = payload?.nodeId as string | undefined
    const label = (payload?.label as string) || 'Unknown'
    if (nodeId) {
      const existing = nodeCounts.get(nodeId)
      if (existing) {
        existing.count++
      } else {
        nodeCounts.set(nodeId, { label, count: 1 })
      }
    }
  }

  const entries = [...nodeCounts.entries()].map(([nodeId, { label, count }]) => ({
    nodeId,
    label,
    editCount: count,
    intensity: 0,
  }))

  const maxCount = Math.max(1, ...entries.map((e) => e.editCount))
  for (const entry of entries) {
    entry.intensity = entry.editCount / maxCount
  }

  return entries.sort((a, b) => b.editCount - a.editCount)
}

/**
 * Engagement summary: total sessions (approximated by grouping edits
 * into 30-minute windows), avg duration, edits per session.
 */
export async function getEngagementSummary(courseId: string): Promise<EngagementSummary> {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const [edits, uniqueEditors] = await Promise.all([
    prisma.courseMapEdit.findMany({
      where: { courseId, createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.courseMapEdit.findMany({
      where: { courseId, createdAt: { gte: subDays(new Date(), 7) } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  if (edits.length === 0) {
    return { totalSessions: 0, avgSessionDurationMin: 0, editsPerSession: 0, uniqueEditors7d: uniqueEditors.length }
  }

  // Group edits into sessions: same user, gap < 30 min = same session
  const SESSION_GAP_MS = 30 * 60 * 1000
  const sessions: { userId: string; start: Date; end: Date; editCount: number }[] = []
  let currentSession: typeof sessions[0] | null = null

  for (const edit of edits) {
    if (
      currentSession &&
      currentSession.userId === edit.userId &&
      edit.createdAt.getTime() - currentSession.end.getTime() < SESSION_GAP_MS
    ) {
      currentSession.end = edit.createdAt
      currentSession.editCount++
    } else {
      if (currentSession) sessions.push(currentSession)
      currentSession = { userId: edit.userId, start: edit.createdAt, end: edit.createdAt, editCount: 1 }
    }
  }
  if (currentSession) sessions.push(currentSession)

  const totalSessions = sessions.length
  const totalDurationMin = sessions.reduce((sum, s) => sum + (s.end.getTime() - s.start.getTime()) / 60000, 0)
  const avgSessionDurationMin = Math.round((totalDurationMin / totalSessions) * 10) / 10
  const editsPerSession = Math.round((edits.length / totalSessions) * 10) / 10

  return {
    totalSessions,
    avgSessionDurationMin,
    editsPerSession,
    uniqueEditors7d: uniqueEditors.length,
  }
}

/**
 * Users who edited within the last 15 minutes.
 */
async function getRecentActiveUsers(courseId: string) {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)

  const recentEdits = await prisma.courseMapEdit.findMany({
    where: { courseId, createdAt: { gte: fifteenMinAgo } },
    select: { userId: true, createdAt: true, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const seen = new Map<string, { name: string; lastActiveAt: Date }>()
  for (const e of recentEdits) {
    if (!seen.has(e.userId)) {
      seen.set(e.userId, { name: e.user.name, lastActiveAt: e.createdAt })
    }
  }

  return [...seen.entries()].map(([userId, { name, lastActiveAt }]) => ({
    userId,
    name,
    lastActiveAt: lastActiveAt.toISOString(),
  }))
}

/**
 * Edit count in the last 15 minutes (live counter).
 */
async function getRecentEditCount(courseId: string): Promise<number> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
  return prisma.courseMapEdit.count({
    where: { courseId, createdAt: { gte: fifteenMinAgo } },
  })
}
