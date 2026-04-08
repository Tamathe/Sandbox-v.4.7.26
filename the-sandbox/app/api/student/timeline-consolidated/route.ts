/**
 * GET /api/student/timeline-consolidated
 *
 * Returns a merged timeline of upcoming items across all enrolled courses.
 * Includes assignments, materials, and objectives for the next 30 days.
 * Auth: student only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { addDays } from 'date-fns'
import { withErrorHandling } from '../../../lib/api-utils'

export interface TimelineItem {
  id: string
  courseId: string
  courseCode: string
  courseTitle: string
  weekNumber: number
  weekTitle: string
  type: 'assignment' | 'material'
  title: string
  dueAt: string | null
  category?: string
  pointsPossible?: number
  isCompleted: boolean
  url: string
}

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    if (auth.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student only' }, { status: 403 })
    }

    const now = new Date()
    const horizon = addDays(now, 30)

    // Get all enrolled courses with their weeks, assignments, and materials
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: auth.user.id },
      select: {
        course: {
          select: {
            id: true,
            courseCode: true,
            title: true,
            weeks: {
              orderBy: { orderIndex: 'asc' },
              select: {
                weekNumber: true,
                title: true,
                startDate: true,
                endDate: true,
                assignments: {
                  where: {
                    isPublished: true,
                    dueAt: { gte: now, lte: horizon },
                  },
                  select: {
                    id: true,
                    title: true,
                    dueAt: true,
                    category: true,
                    pointsPossible: true,
                    submissions: {
                      where: { studentId: auth.user.id },
                      select: { id: true },
                      take: 1,
                    },
                  },
                },
                materials: {
                  where: { isVisible: true },
                  select: {
                    id: true,
                    title: true,
                    materialType: true,
                    readStatuses: {
                      where: { userId: auth.user.id },
                      select: { id: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const items: TimelineItem[] = []

    for (const enrollment of enrollments) {
      const course = enrollment.course

      for (const week of course.weeks) {
        // Determine if this week is current or upcoming based on dates
        const weekEnd = week.endDate ? new Date(week.endDate) : null
        const weekStart = week.startDate ? new Date(week.startDate) : null
        const isRelevantWeek =
          (weekStart && weekEnd && weekEnd >= now && weekStart <= horizon) ||
          (weekStart && !weekEnd && weekStart <= horizon && weekStart >= addDays(now, -7)) ||
          week.assignments.length > 0 // always include weeks with upcoming assignments

        if (!isRelevantWeek) continue

        // Add assignments
        for (const assignment of week.assignments) {
          items.push({
            id: assignment.id,
            courseId: course.id,
            courseCode: course.courseCode,
            courseTitle: course.title,
            weekNumber: week.weekNumber,
            weekTitle: week.title,
            type: 'assignment',
            title: assignment.title,
            dueAt: assignment.dueAt?.toISOString() ?? null,
            category: assignment.category ?? undefined,
            pointsPossible: assignment.pointsPossible,
            isCompleted: assignment.submissions.length > 0,
            url: `/courses?course=${course.id}&tab=assignments`,
          })
        }

        // Add materials for current/next week only (not all 30 days)
        if (weekStart && weekEnd) {
          const isCurrent = now >= weekStart && now <= weekEnd
          const isNext = weekStart > now && weekStart <= addDays(now, 14)
          if (isCurrent || isNext) {
            for (const material of week.materials) {
              items.push({
                id: material.id,
                courseId: course.id,
                courseCode: course.courseCode,
                courseTitle: course.title,
                weekNumber: week.weekNumber,
                weekTitle: week.title,
                type: 'material',
                title: material.title,
                dueAt: weekEnd.toISOString(),
                category: material.materialType,
                isCompleted: material.readStatuses.length > 0,
                url: `/courses?course=${course.id}&tab=course-map`,
              })
            }
          }
        }
      }
    }

    // Sort by date (assignments without dates go last)
    items.sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })

    return NextResponse.json({ items: items.slice(0, 50) }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
