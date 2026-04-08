// ─── Email Compose Service ──────────────────────────────────
// Sprint 6 of Email × Sandy Intelligence Layer.
// Context-aware email composition — detects page context and suggests
// recipient, subject, and tone so Sandy can pre-fill compose cards.

import { prisma } from '../prisma'

// ─── Types ──────────────────────────────────────────────────

export type { ComposeContext } from './types'
import type { ComposeContext } from './types'

// ─── Context Builder ────────────────────────────────────────

/**
 * Build compose context based on the user's current page and role.
 * Returns suggested recipient, subject, tone, and known contacts.
 */
export async function buildComposeContext(
  currentPage: string,
  userId: string,
): Promise<ComposeContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, department: true },
  })

  const role = user?.role ?? 'STUDENT'
  const contacts = await buildContactsList(userId, role)

  const base: ComposeContext = {
    suggestedTone: role === 'STUDENT' ? 'polished' : 'warm',
    pageContext: currentPage,
    knownContacts: contacts,
  }

  // ── Course page → suggest instructor/students ──────────
  const courseMatch = currentPage.match(/\/courses\/([^/]+)/)
  if (courseMatch) {
    const courseId = courseMatch[1]
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        courseCode: true,
        title: true,
        instructor: { select: { name: true, email: true } },
      },
    })

    if (course) {
      base.relatedCourse = course.courseCode
      if (role === 'STUDENT') {
        base.suggestedRecipient = {
          name: course.instructor.name,
          email: course.instructor.email,
          role: 'EDUCATOR',
        }
        base.suggestedSubject = `${course.courseCode} — `
        base.suggestedTone = 'polished'
      } else {
        base.suggestedSubject = `${course.courseCode}: `
        base.suggestedTone = 'warm'
      }
    }
  }

  // ── Staff pages → formal tone ──────────────────────────
  if (currentPage.startsWith('/staff')) {
    base.suggestedTone = 'polished'
  }

  // ── Registrar → formal, student-focused ────────────────
  if (currentPage.startsWith('/registrar')) {
    base.suggestedTone = 'polished'
  }

  return base
}

// ─── Contacts List Builder ──────────────────────────────────

async function buildContactsList(
  userId: string,
  role: string,
): Promise<ComposeContext['knownContacts']> {
  const contacts: ComposeContext['knownContacts'] = []

  try {
    if (role === 'STUDENT') {
      // Students see their instructors
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        select: {
          course: {
            select: {
              courseCode: true,
              instructor: { select: { name: true, email: true } },
            },
          },
        },
      })
      for (const e of enrollments) {
        contacts.push({
          name: e.course.instructor.name,
          email: e.course.instructor.email,
          role: 'EDUCATOR',
          context: `Instructor for ${e.course.courseCode}`,
        })
      }
    } else {
      // Educators/admins see their students
      const courses = await prisma.course.findMany({
        where: { instructorId: userId },
        select: {
          courseCode: true,
          enrollments: {
            select: { student: { select: { name: true, email: true } } },
            take: 30,
          },
        },
      })
      for (const c of courses) {
        for (const e of c.enrollments) {
          contacts.push({
            name: e.student.name,
            email: e.student.email,
            role: 'STUDENT',
            context: `Enrolled in ${c.courseCode}`,
          })
        }
      }
    }
  } catch {
    // Non-fatal
  }

  // Deduplicate by email
  const seen = new Set<string>()
  return contacts.filter((c) => {
    if (seen.has(c.email)) return false
    seen.add(c.email)
    return true
  })
}
