/**
 * meeting-machine-preflight.ts
 *
 * Shared preflight for all Meeting Machine tools. Loads user context,
 * known contacts, courses, and recent meeting chain data.
 */

import { prisma } from './prisma'

export interface MeetingMachinePreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    role: 'STUDENT' | 'EDUCATOR' | 'ADMIN'
  }
  knownContacts: {
    name: string
    role: 'professor' | 'student' | 'classmate' | 'advisor'
    context: string
  }[]
  courses: {
    code: string
    title: string
    role: 'instructor' | 'student'
  }[]
  writingStyle: string | null
}

export async function getMeetingMachinePreflight(userId: string): Promise<MeetingMachinePreflight> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, department: true, college: true, role: true },
  })

  const [writingStyleMem, contacts, courses] = await Promise.all([
    prisma.userMemory
      .findFirst({
        where: { userId, category: 'WRITING_STYLE' },
        select: { content: true },
        orderBy: { updatedAt: 'desc' },
      })
      .catch(() => null),
    buildContacts(userId, user.role),
    buildCourses(userId, user.role),
  ])

  return {
    user: { ...user, role: user.role as 'STUDENT' | 'EDUCATOR' | 'ADMIN' },
    knownContacts: contacts,
    courses,
    writingStyle: writingStyleMem?.content ?? null,
  }
}

async function buildContacts(
  userId: string,
  role: string,
): Promise<MeetingMachinePreflight['knownContacts']> {
  const contacts: MeetingMachinePreflight['knownContacts'] = []

  try {
    if (role === 'STUDENT') {
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        select: {
          course: {
            select: {
              courseCode: true,
              title: true,
              instructor: { select: { name: true } },
            },
          },
        },
      })
      for (const e of enrollments) {
        if (e.course.instructor.name) {
          contacts.push({
            name: e.course.instructor.name,
            role: 'professor',
            context: `teaches ${e.course.courseCode}`,
          })
        }
      }
    }

    if (role === 'EDUCATOR' || role === 'ADMIN') {
      const courses = await prisma.course.findMany({
        where: { instructorId: userId },
        select: {
          courseCode: true,
          enrollments: {
            select: { student: { select: { name: true } } },
            take: 30,
          },
        },
      })
      for (const c of courses) {
        for (const e of c.enrollments) {
          contacts.push({
            name: e.student.name,
            role: 'student',
            context: `enrolled in ${c.courseCode}`,
          })
        }
      }
    }
  } catch {
    // Non-fatal
  }

  const seen = new Set<string>()
  return contacts.filter((c) => {
    if (seen.has(c.name)) return false
    seen.add(c.name)
    return true
  })
}

async function buildCourses(
  userId: string,
  role: string,
): Promise<MeetingMachinePreflight['courses']> {
  const courses: MeetingMachinePreflight['courses'] = []

  try {
    if (role === 'EDUCATOR' || role === 'ADMIN') {
      const owned = await prisma.course.findMany({
        where: { instructorId: userId },
        select: { courseCode: true, title: true },
      })
      for (const c of owned) {
        courses.push({ code: c.courseCode, title: c.title, role: 'instructor' })
      }
    }

    if (role === 'STUDENT') {
      const enrolled = await prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        select: { course: { select: { courseCode: true, title: true } } },
      })
      for (const e of enrolled) {
        courses.push({ code: e.course.courseCode, title: e.course.title, role: 'student' })
      }
    }
  } catch {
    // Non-fatal
  }

  return courses
}
