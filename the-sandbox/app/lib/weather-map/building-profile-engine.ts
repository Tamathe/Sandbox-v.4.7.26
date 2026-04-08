/**
 * Learning Weather Map — Building Profile Engine
 *
 * Computes per-building academic profiles from tool session data.
 * All location data is schedule-inferred, never GPS.
 */

import { prisma } from '../prisma'
import { inferSessionLocations } from './location-inference'
import { inferNoiseLevel } from './weather-utils'
import type { BuildingProfileData } from './types'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function topN(counts: number[], n: number): number[] {
  return counts
    .map((count, index) => ({ count, index }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .filter((x) => x.count > 0)
    .map((x) => x.index)
}

type SessionRow = {
  id: string
  userId: string
  startedAt: Date
  durationSeconds: number | null
  score: number | null
  courseId: string | null
  conceptsTouched: string[]
}

/**
 * Compute a building profile from pre-partitioned sessions.
 * No DB queries — pure computation on the provided data.
 */
function computeProfileFromSessions(
  buildingType: string,
  amenities: string[],
  sessions: SessionRow[],
  weeks: number,
): BuildingProfileData {
  const uniqueStudents = new Set(sessions.map((s) => s.userId)).size

  const withDuration = sessions.filter((s) => s.durationSeconds != null)
  const avgDuration =
    withDuration.length > 0
      ? withDuration.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) /
        withDuration.length /
        60
      : 0

  const hourCounts = new Array(24).fill(0) as number[]
  const dayCounts = new Array(7).fill(0) as number[]
  for (const s of sessions) {
    hourCounts[s.startedAt.getHours()]++
    dayCounts[s.startedAt.getDay()]++
  }

  const courseFreq: Record<string, number> = {}
  for (const s of sessions) {
    if (s.courseId) courseFreq[s.courseId] = (courseFreq[s.courseId] || 0) + 1
  }
  const topCourses = Object.entries(courseFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const conceptFreq: Record<string, number> = {}
  for (const s of sessions) {
    for (const c of s.conceptsTouched) {
      conceptFreq[c] = (conceptFreq[c] || 0) + 1
    }
  }
  const topStudyModes = Object.entries(conceptFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mode]) => mode)

  const withScores = sessions.filter((s) => s.score != null)
  const avgScore =
    withScores.length > 0
      ? (withScores.reduce((sum, s) => sum + (s.score ?? 0), 0) /
          withScores.length) *
        100
      : null

  const noiseLevel = inferNoiseLevel(buildingType)
  const hasStudySpaces = ['LIBRARY', 'ACADEMIC', 'STUDENT_SERVICES'].includes(buildingType)
  const hasFood =
    ['DINING', 'STUDENT_SERVICES'].includes(buildingType) ||
    amenities.some((a) => a.toLowerCase().includes('cafe'))

  const activityScore = Math.min(1, sessions.length / (weeks * 20))
  const outcomeScore = avgScore != null ? avgScore / 100 : 0.5
  const diversityScore = Math.min(1, uniqueStudents / 20)
  const weatherScore =
    activityScore * 0.4 + outcomeScore * 0.3 + diversityScore * 0.3

  return {
    weeklySessionCount: Math.round(sessions.length / weeks),
    weeklyStudentCount: Math.round(uniqueStudents / weeks),
    avgSessionMinutes: Math.round(avgDuration * 10) / 10,
    peakHours: topN(hourCounts, 3),
    peakDays: topN(dayCounts, 3),
    avgSessionScore: avgScore != null ? Math.round(avgScore * 10) / 10 : null,
    avgMasteryGain: null,
    topCourses,
    topStudyModes,
    bloomDistribution: null,
    hasStudySpaces,
    hasFood,
    noiseLevel,
    wifiQuality: null,
    weatherScore: Math.round(weatherScore * 1000) / 1000,
    weatherTrend: 'stable',
  }
}

/**
 * Refresh all building profiles. Called by nightly cron.
 *
 * Fetches all sessions once, infers locations once, then partitions
 * by building for O(1) profile computation per building.
 */
export async function refreshAllBuildingProfiles(): Promise<{
  refreshed: number
  errors: number
}> {
  const since = daysAgo(30)
  const weeks = 4

  // Fetch all buildings and all sessions once
  const [buildings, rawSessions] = await Promise.all([
    prisma.campusBuilding.findMany({
      select: { id: true, name: true, type: true, amenities: true },
    }),
    prisma.toolSession.findMany({
      where: { startedAt: { gte: since }, userId: { not: null } },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        durationSeconds: true,
        score: true,
        courseId: true,
        conceptsTouched: true,
      },
    }),
  ])

  // Filter to sessions with userId and prepare for location inference
  const sessions: SessionRow[] = rawSessions
    .filter((s): s is typeof s & { userId: string } => s.userId != null)
    .map((s) => ({
      id: s.id,
      userId: s.userId,
      startedAt: s.startedAt,
      durationSeconds: s.durationSeconds,
      score: s.score,
      courseId: s.courseId,
      conceptsTouched: s.conceptsTouched,
    }))

  // Infer locations for all sessions once
  const locationMap = await inferSessionLocations(
    sessions.map((s) => ({ id: s.id, userId: s.userId, startedAt: s.startedAt })),
  )

  // Partition sessions by building name
  const sessionsByBuilding = new Map<string, SessionRow[]>()
  for (const s of sessions) {
    const buildingName = locationMap.get(s.id)
    if (!buildingName) continue
    const arr = sessionsByBuilding.get(buildingName) ?? []
    arr.push(s)
    sessionsByBuilding.set(buildingName, arr)
  }

  let refreshed = 0
  let errors = 0

  for (const building of buildings) {
    try {
      const nearbySessions = sessionsByBuilding.get(building.name) ?? []
      const profile = computeProfileFromSessions(
        building.type,
        building.amenities,
        nearbySessions,
        weeks,
      )

      const data = {
        weeklySessionCount: profile.weeklySessionCount,
        weeklyStudentCount: profile.weeklyStudentCount,
        avgSessionMinutes: profile.avgSessionMinutes,
        peakHours: profile.peakHours,
        peakDays: profile.peakDays,
        avgMasteryGain: profile.avgMasteryGain,
        avgSessionScore: profile.avgSessionScore,
        topCourses: profile.topCourses,
        topStudyModes: profile.topStudyModes,
        bloomDistribution: profile.bloomDistribution ?? undefined,
        hasStudySpaces: profile.hasStudySpaces,
        hasFood: profile.hasFood,
        noiseLevel: profile.noiseLevel,
        wifiQuality: profile.wifiQuality,
        weatherScore: profile.weatherScore,
        weatherTrend: profile.weatherTrend,
      }

      await prisma.buildingAcademicProfile.upsert({
        where: { buildingId: building.id },
        create: {
          building: { connect: { id: building.id } },
          ...data,
        },
        update: {
          ...data,
          computedAt: new Date(),
        },
      })

      refreshed++
    } catch {
      errors++
    }
  }

  return { refreshed, errors }
}
