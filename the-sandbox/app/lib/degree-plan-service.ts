import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import type { DegreePlan, PlannedCourse, PlannedCourseStatus } from '../generated/prisma'

export type { DegreePlan, PlannedCourse }

// Schema note: DegreePlan.name maps to the spec's "title"; DegreePlan.programId is required.
// PlannedCourse.intendedSemester maps to the spec's "semester"; semesterIndex maps to "year".

export async function getDegreePlansForUser(userId: string): Promise<DegreePlan[]> {
  return prisma.degreePlan.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      courses: {
        include: { catalog: true },
      },
    },
  })
}

export async function getDegreePlan(planId: string, userId: string): Promise<DegreePlan | null> {
  const plan = await prisma.degreePlan.findUnique({
    where: { id: planId },
    include: {
      courses: {
        include: { catalog: true },
      },
    },
  })
  if (!plan || plan.studentId !== userId) return null
  return plan
}

export async function createDegreePlan(
  userId: string,
  data: { title: string; programId: string; targetGradYear?: number; targetGradSemester?: string }
): Promise<DegreePlan> {
  // targetGradYear and targetGradSemester have no schema columns — not persisted
  return prisma.degreePlan.create({
    data: {
      studentId: userId,
      programId: data.programId,
      name: data.title,
    },
    include: {
      courses: {
        include: { catalog: true },
      },
    },
  })
}

export async function updateDegreePlan(
  planId: string,
  userId: string,
  data: { title?: string; targetGradYear?: number; targetGradSemester?: string }
): Promise<DegreePlan | null> {
  const existing = await prisma.degreePlan.findUnique({ where: { id: planId } })
  if (!existing || existing.studentId !== userId) return null

  return prisma.degreePlan.update({
    where: { id: planId },
    data: {
      ...(data.title !== undefined ? { name: data.title } : {}),
    },
    include: {
      courses: {
        include: { catalog: true },
      },
    },
  })
}

export async function deleteDegreePlan(planId: string, userId: string): Promise<boolean> {
  const existing = await prisma.degreePlan.findUnique({ where: { id: planId } })
  if (!existing || existing.studentId !== userId) return false
  await prisma.degreePlan.delete({ where: { id: planId } })
  return true
}

export async function addCourseToPlan(
  planId: string,
  userId: string,
  data: { courseCode: string; semester: string; year: number; status?: string }
): Promise<PlannedCourse | null> {
  const plan = await prisma.degreePlan.findUnique({ where: { id: planId } })
  if (!plan || plan.studentId !== userId) return null

  return prisma.plannedCourse.create({
    data: {
      planId,
      courseCode: data.courseCode,
      intendedSemester: data.semester,
      semesterIndex: data.year,
      ...(data.status ? { status: data.status as PlannedCourseStatus } : {}),
    },
  })
}

export async function removeCourseFromPlan(
  planId: string,
  entryId: string,
  userId: string
): Promise<boolean> {
  const plan = await prisma.degreePlan.findUnique({ where: { id: planId } })
  if (!plan || plan.studentId !== userId) return false

  const entry = await prisma.plannedCourse.findFirst({ where: { id: entryId, planId } })
  if (!entry) return false

  await prisma.plannedCourse.delete({ where: { id: entryId } })
  return true
}

export async function updatePlannedCourse(
  planId: string,
  entryId: string,
  userId: string,
  data: { semester?: string; year?: number; status?: string }
): Promise<PlannedCourse | null> {
  const plan = await prisma.degreePlan.findUnique({ where: { id: planId } })
  if (!plan || plan.studentId !== userId) return null

  const entry = await prisma.plannedCourse.findFirst({ where: { id: entryId, planId } })
  if (!entry) return null

  return prisma.plannedCourse.update({
    where: { id: entryId },
    data: {
      ...(data.semester !== undefined ? { intendedSemester: data.semester } : {}),
      ...(data.year !== undefined ? { semesterIndex: data.year } : {}),
      ...(data.status !== undefined ? { status: data.status as PlannedCourseStatus } : {}),
    },
  })
}

// ── AI course suggestions ──────────────────────────────────────────────────

export interface CourseSuggestion {
  code: string
  title: string
  reason: string
}

export async function getCourseSuggestions(userId: string): Promise<CourseSuggestion[]> {
  const plans = await prisma.degreePlan.findMany({
    where: { studentId: userId },
    include: {
      courses: { include: { catalog: true } },
      program: true,
    },
  })

  const enrolledCourses = plans.flatMap((p) =>
    p.courses.map((c) => `${c.courseCode} — ${c.catalog?.title ?? 'Unknown'}`)
  )

  if (enrolledCourses.length === 0) {
    return []
  }

  const programName = plans[0]?.program?.name ?? 'their degree'

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `A University of Kentucky student pursuing ${programName} has these courses planned:\n${enrolledCourses.join('\n')}\n\nSuggest 2-3 additional courses they should consider. For each, give a JSON object with "code" (course code like "CS 315"), "title" (course name), and "reason" (one sentence why). Return ONLY a JSON array, no other text.`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.slice(0, 3) : []
  } catch {
    // Try extracting JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        const arr = JSON.parse(match[0])
        return Array.isArray(arr) ? arr.slice(0, 3) : []
      } catch {
        return []
      }
    }
    return []
  }
}
