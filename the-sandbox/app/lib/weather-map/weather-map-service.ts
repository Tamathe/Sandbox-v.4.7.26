/**
 * Learning Weather Map — Main Service
 *
 * Read weather map data, compute personalized study recommendations,
 * and provide integration hooks for Sandy and briefing.
 */

import { prisma } from '../prisma'
import { getCachedCampusBuildings } from '../cached-queries'
import { matchesCourse } from './weather-utils'
import type { WeatherMapData, StudyRecommendation } from './types'

function isStale(date: Date, hours: number): boolean {
  return Date.now() - date.getTime() > hours * 60 * 60 * 1000
}

/**
 * Get the full weather map data for the campus overlay.
 */
export async function getWeatherMap(): Promise<WeatherMapData> {
  const profiles = await prisma.buildingAcademicProfile.findMany({
    include: { building: true },
    orderBy: { weatherScore: 'desc' },
  })

  return {
    buildings: profiles.map((p) => ({
      id: p.building.id,
      name: p.building.name,
      lat: p.building.latitude,
      lng: p.building.longitude,
      type: p.building.type,
      weatherScore: p.weatherScore,
      weatherTrend: p.weatherTrend,
      weeklyStudents: p.weeklyStudentCount,
      weeklySessions: p.weeklySessionCount,
      avgMinutes: p.avgSessionMinutes,
      peakHours: p.peakHours,
      topCourses: p.topCourses,
      topModes: p.topStudyModes,
      noiseLevel: p.noiseLevel,
      hasStudySpaces: p.hasStudySpaces,
      hasFood: p.hasFood,
      avgSessionScore: p.avgSessionScore,
    })),
    lastComputed: (profiles[0]?.computedAt ?? new Date()).toISOString(),
  }
}

/**
 * Get personalized study recommendations for a user.
 * Uses 24h cache from DB.
 */
export async function getStudyRecommendations(
  userId: string,
): Promise<StudyRecommendation[]> {
  const cached = await prisma.studyLocationRecommendation.findUnique({
    where: { userId },
  })

  if (cached && !isStale(cached.computedAt, 24)) {
    return cached.recommendations as unknown as StudyRecommendation[]
  }

  return computeStudyRecommendations(userId)
}

/**
 * Compute personalized study recommendations.
 */
async function computeStudyRecommendations(
  userId: string,
): Promise<StudyRecommendation[]> {
  // Fetch all independent data in parallel
  const [enrollments, profiles, campusBuildings, fingerprint] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: { course: { select: { id: true, title: true, courseCode: true } } },
    }),
    prisma.buildingAcademicProfile.findMany({
      include: { building: true },
      where: { weatherScore: { gt: 0 } },
      orderBy: { weatherScore: 'desc' },
    }),
    getCachedCampusBuildings(),
    prisma.engagementFingerprint.findUnique({ where: { userId } }),
  ])

  if (profiles.length === 0) return []

  const courseBuildings = new Map<string, string>()
  for (const enrollment of enrollments) {
    const code = enrollment.course.courseCode.toLowerCase()
    const title = enrollment.course.title.toLowerCase()
    const building = campusBuildings.find((b) => {
      const bName = b.name.toLowerCase()
      const bShort = b.shortName?.toLowerCase() ?? ''
      return matchesCourse(code, title, bName, bShort)
    })
    if (building) {
      courseBuildings.set(building.name, enrollment.course.title)
    }
  }

  // Score each building for this user
  const recommendations: StudyRecommendation[] = profiles
    .map((profile) => {
      let score = profile.weatherScore * 0.3

      // Boost buildings near user's classes
      const isNearClass = courseBuildings.has(profile.building.name)
      if (isNearClass) score += 0.25

      // Boost based on fingerprint
      if (fingerprint) {
        if (
          fingerprint.chronotype === 'night-owl' &&
          profile.peakHours.some((h: number) => h >= 20)
        )
          score += 0.1
        if (
          fingerprint.socialOrientation === 'solo' &&
          profile.noiseLevel === 'quiet'
        )
          score += 0.15
        if (
          fingerprint.socialOrientation === 'community-active' &&
          profile.weeklyStudentCount > 10
        )
          score += 0.1
      }

      if (profile.hasStudySpaces) score += 0.1

      const reasons: string[] = []
      if (isNearClass) reasons.push('Near your classes')
      if (profile.hasStudySpaces) reasons.push('Study spaces available')
      if (profile.noiseLevel === 'quiet') reasons.push('Quiet environment')
      if (profile.weeklyStudentCount > 15) reasons.push('Popular study spot')
      if (profile.avgSessionScore && profile.avgSessionScore > 75)
        reasons.push('High-performance location')

      const relevantCourses: string[] = []
      const courseTitle = courseBuildings.get(profile.building.name)
      if (courseTitle) relevantCourses.push(courseTitle)

      return {
        buildingId: profile.building.id,
        buildingName: profile.building.name,
        score: Math.min(1, score),
        reason: reasons.slice(0, 2).join(' · ') || 'Good study location',
        courseRelevance: relevantCourses,
        weatherScore: profile.weatherScore,
        noiseLevel: profile.noiseLevel,
        peakHours: profile.peakHours,
        hasFood: profile.hasFood,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // Cache recommendations
  await prisma.studyLocationRecommendation.upsert({
    where: { userId },
    create: {
      user: { connect: { id: userId } },
      recommendations: recommendations as unknown as import('../../generated/prisma').Prisma.InputJsonValue,
      basedOnCourses: enrollments.map((e) => e.course.id),
    },
    update: {
      recommendations: recommendations as unknown as import('../../generated/prisma').Prisma.InputJsonValue,
      basedOnCourses: enrollments.map((e) => e.course.id),
      computedAt: new Date(),
    },
  })

  return recommendations
}

// ── Integration hooks (wired by integration merge) ──

/**
 * Build Sandy prompt context for weather map awareness.
 */
export async function buildWeatherMapSandyContext(
  userId: string,
): Promise<string> {
  const recs = await getStudyRecommendations(userId)
  if (recs.length === 0) return ''

  const topSpots = recs
    .slice(0, 3)
    .map(
      (r) =>
        `- ${r.buildingName} (score ${Math.round(r.score * 100)}%): ${r.reason}`,
    )
    .join('\n')

  return `<study-location-intelligence>
The Learning Weather Map suggests these study spots for the student:
${topSpots}
Data is estimated from session patterns, not real-time occupancy.
</study-location-intelligence>`
}

/**
 * Build briefing block for study spot nudge.
 */
export async function buildWeatherMapBriefingBlock(
  userId: string,
): Promise<{ topSpot: string; reason: string } | null> {
  const recs = await getStudyRecommendations(userId)
  if (recs.length === 0) return null
  const top = recs[0]
  return { topSpot: top.buildingName, reason: top.reason }
}
