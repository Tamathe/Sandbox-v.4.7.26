import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, invalidateUserCache, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

type ImportCourseItem = {
  code: string
  name: string
  semester?: string
  source?: string
  confidence?: 'high' | 'medium' | 'low'
}

type ImportCoursesBody = {
  email: string
  courses: ImportCourseItem[]
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as ImportCoursesBody
  const { courses } = body

  if (!Array.isArray(courses)) {
    return NextResponse.json({ error: 'courses array is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: auth.user.email },
    select: { id: true, role: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only educators can import courses' }, { status: 403 })
  }

  const imported: { id: string; code: string; enrollmentUrl: string }[] = []

  const validItems = courses
    .slice(0, 10)
    .map((item) => ({ ...item, code: item.code.trim().toUpperCase(), name: item.name.trim() }))
    .filter((item) => item.code && item.name)

  // Batch lookup all course codes in a single query instead of N findUnique calls
  const codes = validItems.map((item) => item.code)
  const existingCourses = await prisma.course.findMany({
    where: { courseCode: { in: codes } },
    select: { id: true, courseCode: true, enrollmentKey: true },
  })
  const existingByCode = new Map(existingCourses.map((c) => [c.courseCode, c]))

  for (const item of validItems) {
    const { code, name: title } = item
    try {
      const existing = existingByCode.get(code)
      if (existing) {
        // Course exists — link educator
        const enrollmentKey = existing.enrollmentKey ?? undefined
        imported.push({
          id: existing.id,
          code,
          enrollmentUrl: enrollmentKey ? `/join/${enrollmentKey}` : `/courses/${existing.id}`,
        })
      } else {
        const course = await prisma.course.create({
          data: {
            courseCode: code,
            title,
            semester: item.semester ?? null,
            importSource: item.source ?? 'onboarding',
            instructorId: user.id,
            isPublic: false,
          },
        })
        imported.push({
          id: course.id,
          code,
          enrollmentUrl: course.enrollmentKey ? `/join/${course.enrollmentKey}` : `/courses/${course.id}`,
        })
      }
    } catch {
      // Skip individual course failures — log and continue
      console.error(`Failed to import course ${code}`)
    }
  }

  invalidateUserCache(auth.user.email)

  return NextResponse.json({ imported })
})
