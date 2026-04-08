/**
 * Learning Weather Map — Location Inference
 *
 * Infers probable student location from course schedule proximity.
 * Uses same heuristic building matching as my-buildings API.
 * NOT GPS — clearly labeled as "estimated" in all UI.
 */

import { prisma } from '../prisma'
import { getCachedCampusBuildings } from '../cached-queries'
import { matchesCourse } from './weather-utils'

interface UserBuilding {
  buildingName: string
}

/**
 * Get all building names for a student's enrolled courses.
 */
async function getUserCourseBuildings(
  userId: string,
): Promise<UserBuilding[]> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: {
      course: {
        select: { courseCode: true, title: true },
      },
    },
  })

  if (enrollments.length === 0) return []

  const campusBuildings = await getCachedCampusBuildings()
  const results: UserBuilding[] = []

  for (const enrollment of enrollments) {
    const code = enrollment.course.courseCode.toLowerCase()
    const title = enrollment.course.title.toLowerCase()

    const building = campusBuildings.find((b) => {
      const bName = b.name.toLowerCase()
      const bShort = b.shortName?.toLowerCase() ?? ''
      return matchesCourse(code, title, bName, bShort)
    })

    if (building) {
      results.push({ buildingName: building.name })
    }
  }

  return results
}

/**
 * Batch version: for a list of tool sessions, infer locations.
 * Returns Map of sessionId → buildingName.
 *
 * Groups by user to minimize DB queries.
 */
export async function inferSessionLocations(
  sessions: Array<{ id: string; userId: string; startedAt: Date }>,
): Promise<Map<string, string>> {
  const locationMap = new Map<string, string>()

  // Group sessions by userId
  const byUser = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const arr = byUser.get(s.userId) ?? []
    arr.push(s)
    byUser.set(s.userId, arr)
  }

  for (const [userId, userSessions] of byUser) {
    const buildings = await getUserCourseBuildings(userId)
    if (buildings.length === 0) continue

    for (const session of userSessions) {
      // v1: assign to first course building
      // Future: match session timestamp against course schedule times
      const building = buildings[0]?.buildingName
      if (building) {
        locationMap.set(session.id, building)
      }
    }
  }

  return locationMap
}
