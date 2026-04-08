import { NextRequest, NextResponse } from 'next/server'

import { getPrismaClient } from '../../../lib/prisma'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const prisma = getPrismaClient()

  // Get all courses owned by this educator with their materials
  const courses = await prisma.course.findMany({
    where: { instructorId: auth.user.id },
    select: {
      id: true,
      courseCode: true,
      title: true,
      weeks: {
        orderBy: { weekNumber: 'asc' },
        select: {
          id: true,
          title: true,
          weekNumber: true,
          materials: {
            where: { isVisible: true },
            select: {
              id: true,
              title: true,
              content: true,
              materialType: true,
              moduleNumber: true,
              objectives: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  })

  // Structure into a clean response
  const result = courses.map(course => ({
    courseId: course.id,
    courseCode: course.courseCode,
    courseTitle: course.title,
    modules: course.weeks.map(week => ({
      weekId: week.id,
      title: week.title,
      weekNumber: week.weekNumber,
      materialCount: week.materials.length,
      materials: week.materials.map(m => ({
        id: m.id,
        title: m.title,
        content: m.content,
        materialType: m.materialType,
        objectives: m.objectives.map(o => o.title),
      })),
    })),
  }))

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
