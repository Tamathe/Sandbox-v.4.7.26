/**
 * email-rewriter-preflight.ts
 *
 * Aggregates user profile + known contacts for the Email Rewriter's
 * Smart Preloading (Beat 0). Lighter than Cover Letter — email rewriting
 * is input-driven, not profile-driven.
 */

import { prisma } from './prisma'

export interface EmailRewriterPreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    role: 'STUDENT' | 'EDUCATOR' | 'ADMIN'
  }
  writingStyle: string | null
  interests: string[]
  knownContacts: {
    name: string
    role: 'professor' | 'classmate' | 'advisor' | 'student'
    context: string
  }[]
}

export async function getEmailRewriterPreflight(userId: string): Promise<EmailRewriterPreflight> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, department: true, college: true, role: true },
  })

  const [writingStyleMem, interests, contacts] = await Promise.all([
    prisma.userMemory
      .findFirst({
        where: { userId, category: 'WRITING_STYLE' },
        select: { content: true },
        orderBy: { updatedAt: 'desc' },
      })
      .catch(() => null),
    prisma.userInterest
      .findMany({
        where: { userId, accepted: true },
        select: { tag: true },
        take: 10,
      })
      .catch(() => []),
    buildKnownContacts(userId, user.role),
  ])

  return {
    user: { ...user, role: user.role as 'STUDENT' | 'EDUCATOR' | 'ADMIN' },
    writingStyle: writingStyleMem?.content ?? null,
    interests: interests.map((i) => i.tag),
    knownContacts: contacts,
  }
}

async function buildKnownContacts(
  userId: string,
  role: string,
): Promise<EmailRewriterPreflight['knownContacts']> {
  const contacts: EmailRewriterPreflight['knownContacts'] = []

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
            context: `teaches ${e.course.courseCode} ${e.course.title}`,
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
            take: 50,
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
    // Non-fatal — contacts are a bonus
  }

  // Deduplicate by name
  const seen = new Set<string>()
  return contacts.filter((c) => {
    if (seen.has(c.name)) return false
    seen.add(c.name)
    return true
  })
}
