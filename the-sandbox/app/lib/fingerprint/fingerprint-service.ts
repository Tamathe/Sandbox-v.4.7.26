// ── Engagement Fingerprint — Persistence & Caching Service ────────────────────
// getFingerprint: returns cached if <24h, else lazy-refreshes.
// refreshFingerprint: recomputes and upserts to DB.
// getCourseFingerprint / refreshCourseFingerprint: class-level aggregations.

import { prisma } from '../prisma'
import type { ComputedFingerprint } from './types'
import { computeFingerprint } from './fingerprint-engine'

// ── Helpers ──────────────────────────────────────────────────────────────────

function isStale(computedAt: Date): boolean {
  return Date.now() - computedAt.getTime() > 24 * 60 * 60 * 1000
}

/** Map nested ComputedFingerprint to flat Prisma model fields */
function flattenFingerprint(fp: ComputedFingerprint) {
  return {
    // Temporal
    peakHours: fp.temporal.peakHours,
    peakDays: fp.temporal.peakDays,
    chronotype: fp.temporal.chronotype,
    sessionCadence: fp.temporal.sessionCadence,
    // Learning
    preferredStudyModes: fp.learning.preferredStudyModes,
    preferredModality: fp.learning.preferredModality,
    bloomProfile: fp.learning.bloomProfile,
    learningVelocity: fp.learning.learningVelocity,
    masteryRetention: fp.learning.masteryRetention,
    // Engagement
    toolDiversity: fp.engagement.toolDiversity,
    consistencyScore: fp.engagement.consistencyScore,
    avgSessionMinutes: fp.engagement.avgSessionMinutes,
    sessionsPerWeek: fp.engagement.sessionsPerWeek,
    deadlineProximity: fp.engagement.deadlineProximity,
    // Social
    collaborationIndex: fp.social.collaborationIndex,
    socialOrientation: fp.social.socialOrientation,
    liveRoomWeekly: fp.social.liveRoomWeekly,
    messagingWeekly: fp.social.messagingWeekly,
    studyGroupCount: fp.social.studyGroupCount,
    // Responsiveness
    nudgeResponseRate: fp.responsiveness.nudgeResponseRate,
    announcementReadRate: fp.responsiveness.announcementReadRate,
    sandyEngagementRate: fp.responsiveness.sandyEngagementRate,
    // Meta
    signalCount: fp.meta.signalCount,
    confidence: fp.meta.confidence,
    version: fp.meta.version,
    windowDays: fp.meta.windowDays,
    computedAt: new Date(),
  }
}

// ── User Fingerprint ─────────────────────────────────────────────────────────

export async function getFingerprint(userId: string): Promise<ComputedFingerprint | null> {
  const existing = await prisma.engagementFingerprint.findUnique({
    where: { userId },
  })

  if (existing && !isStale(existing.computedAt)) {
    return unflattenFingerprint(existing)
  }

  // Lazy refresh
  return refreshFingerprint(userId)
}

export async function refreshFingerprint(userId: string): Promise<ComputedFingerprint> {
  const computed = await computeFingerprint({ userId })
  const flat = flattenFingerprint(computed)

  await prisma.engagementFingerprint.upsert({
    where: { userId },
    create: { userId, ...flat },
    update: flat,
  })

  return computed
}

// ── Course Fingerprint ───────────────────────────────────────────────────────

export async function getCourseFingerprint(courseId: string) {
  const existing = await prisma.courseFingerprint.findUnique({
    where: { courseId },
  })

  if (existing && !isStale(existing.computedAt)) {
    return existing
  }

  return refreshCourseFingerprint(courseId)
}

export async function refreshCourseFingerprint(courseId: string) {
  // Get all enrolled students
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })

  if (enrollments.length === 0) return null

  // Get or compute fingerprint for each student
  const fingerprints: ComputedFingerprint[] = []
  for (const e of enrollments) {
    const fp = await getFingerprint(e.studentId)
    if (fp) fingerprints.push(fp)
  }

  if (fingerprints.length === 0) return null

  const aggregated = aggregateFingerprints(fingerprints)
  const studentCount = fingerprints.length

  const data = {
    studentCount,
    computedAt: new Date(),
    ...aggregated,
  }

  return prisma.courseFingerprint.upsert({
    where: { courseId },
    create: { courseId, ...data },
    update: data,
  })
}

// ── Aggregation ──────────────────────────────────────────────────────────────

function aggregateFingerprints(fps: ComputedFingerprint[]) {
  const n = fps.length

  // Distribution builders
  const chronotypeDistribution = buildDistribution(fps.map((f) => f.temporal.chronotype))
  const cadenceDistribution = buildDistribution(fps.map((f) => f.temporal.sessionCadence))
  const modalityDistribution = buildDistribution(fps.map((f) => f.learning.preferredModality))
  const socialDistribution = buildDistribution(fps.map((f) => f.social.socialOrientation))
  const deadlineDistribution = buildDistribution(fps.map((f) => f.engagement.deadlineProximity))

  // Averages
  const avgCollaborationIndex = avg(fps.map((f) => f.social.collaborationIndex))
  const avgConsistencyScore = avg(fps.map((f) => f.engagement.consistencyScore))
  const avgSessionMinutes = avg(fps.map((f) => f.engagement.avgSessionMinutes))
  const avgToolDiversity = avg(fps.map((f) => f.engagement.toolDiversity))
  const avgNudgeResponseRate = avg(fps.map((f) => f.responsiveness.nudgeResponseRate))

  // Top study modes across all students
  const modeFreq: Record<string, number> = {}
  for (const fp of fps) {
    for (const mode of fp.learning.preferredStudyModes) {
      modeFreq[mode] = (modeFreq[mode] || 0) + 1
    }
  }
  const topStudyModes = Object.entries(modeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => m)

  // Top tools — not directly in fingerprint, leave empty for now
  const topTools: string[] = []

  // Averaged Bloom profile
  const bloomKeys = ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation']
  const bloomProfile: Record<string, number> = {}
  for (const key of bloomKeys) {
    bloomProfile[key] =
      Math.round(
        (fps.reduce((s, f) => s + ((f.learning.bloomProfile[key] as number) || 0), 0) / n) * 100
      ) / 100
  }

  // Dominant categories
  const dominantChronotype = maxKey(chronotypeDistribution)
  const dominantCadence = maxKey(cadenceDistribution)

  // Engagement trend — compare avg consistency to 0.5 threshold
  const avgConfidence = avg(fps.map((f) => f.meta.confidence))
  let engagementTrend: string = 'stable'
  if (avgConsistencyScore > 0.6 && avgConfidence > 0.5) engagementTrend = 'rising'
  else if (avgConsistencyScore < 0.3) engagementTrend = 'declining'

  // Risk signals
  const riskSignals: string[] = []
  const crammerPct = (deadlineDistribution['crammer'] || 0) + (deadlineDistribution['late'] || 0)
  if (crammerPct > 0.4) riskSignals.push(`${Math.round(crammerPct * 100)}% crammers/late submitters`)
  if (avgNudgeResponseRate < 0.3) riskSignals.push('low nudge response rate')
  if (engagementTrend === 'declining') riskSignals.push('declining engagement')
  if (avgToolDiversity < 0.1) riskSignals.push('low tool diversity')

  return {
    chronotypeDistribution,
    cadenceDistribution,
    modalityDistribution,
    socialDistribution,
    deadlineDistribution,
    avgCollaborationIndex,
    avgConsistencyScore,
    avgSessionMinutes,
    avgToolDiversity,
    avgNudgeResponseRate,
    topStudyModes,
    topTools,
    bloomProfile,
    dominantChronotype,
    dominantCadence,
    engagementTrend,
    riskSignals,
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function buildDistribution(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const v of values) counts[v] = (counts[v] || 0) + 1
  const total = values.length || 1
  const dist: Record<string, number> = {}
  for (const [k, c] of Object.entries(counts)) {
    dist[k] = Math.round((c / total) * 100) / 100
  }
  return dist
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

function maxKey(dist: Record<string, number>): string {
  let best = ''
  let bestVal = -1
  for (const [k, v] of Object.entries(dist)) {
    if (v > bestVal) {
      best = k
      bestVal = v
    }
  }
  return best
}

// ── Batch Refresh (Cron) ────────────────────────────────────────────────────

/** Refresh fingerprints for all users with activity in the last 90 days */
export async function refreshAllFingerprints(): Promise<{ refreshed: number; errors: number }> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const activeUsers = await prisma.toolSession.findMany({
    where: { startedAt: { gte: since }, userId: { not: null } },
    select: { userId: true },
    distinct: ['userId'],
  })

  let refreshed = 0
  let errors = 0

  for (const { userId } of activeUsers) {
    if (!userId) continue
    try {
      await refreshFingerprint(userId)
      refreshed++
    } catch {
      errors++
    }
  }

  return { refreshed, errors }
}

/** Refresh course fingerprints for all courses with enrolled students */
export async function refreshAllCourseFingerprints(): Promise<{ refreshed: number; errors: number }> {
  const courses = await prisma.course.findMany({
    where: { enrollments: { some: {} } },
    select: { id: true },
  })

  let refreshed = 0
  let errors = 0

  for (const { id } of courses) {
    try {
      await refreshCourseFingerprint(id)
      refreshed++
    } catch {
      errors++
    }
  }

  return { refreshed, errors }
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** Reconstruct ComputedFingerprint from flat DB row */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unflattenFingerprint(row: any): ComputedFingerprint {
  return {
    temporal: {
      peakHours: row.peakHours,
      peakDays: row.peakDays,
      chronotype: row.chronotype,
      sessionCadence: row.sessionCadence,
    },
    learning: {
      preferredStudyModes: row.preferredStudyModes,
      preferredModality: row.preferredModality,
      bloomProfile: row.bloomProfile as Record<string, number>,
      learningVelocity: row.learningVelocity,
      masteryRetention: row.masteryRetention,
    },
    engagement: {
      toolDiversity: row.toolDiversity,
      consistencyScore: row.consistencyScore,
      avgSessionMinutes: row.avgSessionMinutes,
      sessionsPerWeek: row.sessionsPerWeek,
      deadlineProximity: row.deadlineProximity,
    },
    social: {
      collaborationIndex: row.collaborationIndex,
      socialOrientation: row.socialOrientation,
      liveRoomWeekly: row.liveRoomWeekly,
      messagingWeekly: row.messagingWeekly,
      studyGroupCount: row.studyGroupCount,
    },
    responsiveness: {
      nudgeResponseRate: row.nudgeResponseRate,
      announcementReadRate: row.announcementReadRate,
      sandyEngagementRate: row.sandyEngagementRate,
    },
    meta: {
      signalCount: row.signalCount,
      confidence: row.confidence,
      windowDays: row.windowDays,
      version: row.version,
    },
  }
}
