import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { haversineDistance, walkingMinutes } from '../../../lib/geo-utils'
import { withErrorHandling } from '../../../lib/api-utils'
import { getCachedCampusBuildings } from '../../../lib/cached-queries'

// Heuristic: match course title/code to a building
function matchesCourse(
  code: string, title: string,
  bName: string, bShort: string
): boolean {
  if (bShort && code.includes(bShort)) return true
  if (title.includes('law') && bName.includes('law')) return true
  if (title.includes('business') && bName.includes('gatton')) return true
  if (title.includes('engineering') && (bName.includes('anderson') || bName.includes('marksbury'))) return true
  if (title.includes('computer') && bName.includes('marksbury')) return true
  if (title.includes('chemistry') && bName.includes('chem')) return true
  if (title.includes('biology') && bName.includes('morgan')) return true
  if (title.includes('education') && (bName.includes('taylor') || bName.includes('erikson'))) return true
  return false
}

// Synthetic schedule times keyed by course index
const SCHEDULE_SLOTS = [
  { dayOfWeek: 'MWF', startTime: '09:00', endTime: '09:50' },
  { dayOfWeek: 'TR',  startTime: '10:30', endTime: '11:45' },
  { dayOfWeek: 'MWF', startTime: '11:00', endTime: '11:50' },
  { dayOfWeek: 'TR',  startTime: '13:00', endTime: '14:15' },
  { dayOfWeek: 'MWF', startTime: '14:00', endTime: '14:50' },
  { dayOfWeek: 'MW',  startTime: '15:30', endTime: '16:45' },
]

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: auth.user.id },
      select: {
        course: {
          select: {
            courseCode: true,
            title: true,
          },
        },
      },
    })

    if (enrollments.length === 0) {
      return NextResponse.json({ myBuildings: [], schedule: [] }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    const buildings = await getCachedCampusBuildings()

    // Build schedule entries with building + time slot
    const schedule: {
      slug: string
      name: string
      latitude: number
      longitude: number
      courseCode: string
      courseTitle: string
      dayOfWeek: string
      startTime: string
      endTime: string
    }[] = []

    let slotIdx = 0
    for (const enrollment of enrollments) {
      const code = enrollment.course.courseCode.toLowerCase()
      const title = enrollment.course.title.toLowerCase()

      const building = buildings.find((b) => {
        const bName = b.name.toLowerCase()
        const bShort = b.shortName?.toLowerCase() ?? ''
        return matchesCourse(code, title, bName, bShort)
      })

      if (building) {
        const slot = SCHEDULE_SLOTS[slotIdx % SCHEDULE_SLOTS.length]
        schedule.push({
          slug: building.slug,
          name: building.name,
          latitude: building.latitude,
          longitude: building.longitude,
          courseCode: enrollment.course.courseCode,
          courseTitle: enrollment.course.title,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
        slotIdx++
      }
    }

    // Sort by startTime for chronological ordering
    schedule.sort((a, b) => a.startTime.localeCompare(b.startTime))

    // Compute walking transitions between consecutive classes
    const transitions: {
      from: string
      to: string
      distanceMiles: number
      walkingMinutes: number
      warning: boolean
    }[] = []

    for (let i = 0; i < schedule.length - 1; i++) {
      const cur = schedule[i]
      const next = schedule[i + 1]
      const dist = haversineDistance(cur.latitude, cur.longitude, next.latitude, next.longitude)
      const mins = walkingMinutes(dist)
      transitions.push({
        from: cur.courseCode,
        to: next.courseCode,
        distanceMiles: Math.round(dist * 100) / 100,
        walkingMinutes: mins,
        warning: mins > 10,
      })
    }

    // myBuildings for backwards compat (unique buildings from schedule)
    const seen = new Set<string>()
    const myBuildings = schedule
      .filter((s) => {
        if (seen.has(s.slug)) return false
        seen.add(s.slug)
        return true
      })
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        courseCode: s.courseCode,
        courseTitle: s.courseTitle,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }))

    return NextResponse.json({ myBuildings, schedule, transitions }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
