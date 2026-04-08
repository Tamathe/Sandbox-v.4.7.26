import { prisma } from './prisma'
import type { CatalogCourse } from '../generated/prisma'

export type { CatalogCourse }

export async function getCatalogCourse(courseCode: string): Promise<CatalogCourse | null> {
  return prisma.catalogCourse.findUnique({ where: { courseCode } })
}

export interface CatalogSearchQuery {
  q?: string
  prefix?: string
  creditMin?: number
  creditMax?: number
  page?: number
  pageSize?: number
}

export interface CatalogSearchResult {
  courses: CatalogCourse[]
  total: number
  page: number
  pageSize: number
}

export async function searchCatalogCourses(query: CatalogSearchQuery): Promise<CatalogSearchResult> {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))
  const skip = (page - 1) * pageSize

  const where = {
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { courseCode: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.prefix ? { prefix: { equals: query.prefix, mode: 'insensitive' as const } } : {}),
    ...(query.creditMin !== undefined || query.creditMax !== undefined
      ? {
          creditHoursMax: query.creditMin !== undefined ? { gte: query.creditMin } : undefined,
          creditHoursMin: query.creditMax !== undefined ? { lte: query.creditMax } : undefined,
        }
      : {}),
  }

  const [courses, total] = await prisma.$transaction([
    prisma.catalogCourse.findMany({ where, skip, take: pageSize, orderBy: { courseCode: 'asc' } }),
    prisma.catalogCourse.count({ where }),
  ])

  return { courses, total, page, pageSize }
}

export async function getCatalogPrefixes(): Promise<string[]> {
  const rows = await prisma.catalogCourse.findMany({
    select: { prefix: true },
    distinct: ['prefix'],
    orderBy: { prefix: 'asc' },
  })
  return rows.map((r) => r.prefix)
}

export async function linkCatalogCourseToSandbox(coid: string, sandboxCourseId: string): Promise<void> {
  await prisma.course.update({
    where: { id: sandboxCourseId },
    data: { catalogCourseId: coid },
  })
}

// ── Course → Programs mapping ─────────────────────────────────────────────

export interface CourseProgramMapping {
  programCode: string
  programName: string
  college: string
  category: string
}

export async function getCoursePrograms(courseCode: string): Promise<CourseProgramMapping[]> {
  // Direct matches: course explicitly listed in a requirement
  const directMatches = await prisma.requirementCourse.findMany({
    where: { courseCode: { equals: courseCode, mode: 'insensitive' } },
    include: {
      requirement: {
        include: { program: { select: { code: true, name: true, college: true } } },
      },
    },
  })

  const results: CourseProgramMapping[] = directMatches.map((rc) => ({
    programCode: rc.requirement.program.code,
    programName: rc.requirement.program.name,
    college: rc.requirement.program.college,
    category: rc.requirement.category,
  }))

  // Pattern matches: coursePatterns like "CS 3*" matching "CS 315"
  const allWithPatterns = await prisma.degreeRequirement.findMany({
    where: { coursePatterns: { isEmpty: false } },
    include: { program: { select: { code: true, name: true, college: true } } },
  })

  const normalized = courseCode.toUpperCase().trim()
  for (const req of allWithPatterns) {
    for (const pattern of req.coursePatterns) {
      const regexStr = pattern.replace(/\*/g, '\\d+').replace(/\s+/g, '\\s+')
      try {
        if (new RegExp(`^${regexStr}$`, 'i').test(normalized)) {
          // Avoid duplicates from the same program
          if (!results.some((r) => r.programCode === req.program.code && r.category === req.category)) {
            results.push({
              programCode: req.program.code,
              programName: req.program.name,
              college: req.program.college,
              category: req.category,
            })
          }
        }
      } catch {
        // Invalid regex pattern — skip
      }
    }
  }

  return results
}

// ── Prerequisite Chain ────────────────────────────────────────────────────

export interface PrerequisiteNode {
  courseCode: string
  title: string
  credits: number
  prerequisites: PrerequisiteNode[]
}

export async function getPrerequisiteChain(
  courseCode: string,
  maxDepth = 4,
): Promise<PrerequisiteNode> {
  const visited = new Set<string>()

  async function buildNode(code: string, depth: number): Promise<PrerequisiteNode> {
    const normalizedCode = code.toUpperCase().trim()
    if (visited.has(normalizedCode) || depth >= maxDepth) {
      return { courseCode: normalizedCode, title: normalizedCode, credits: 0, prerequisites: [] }
    }
    visited.add(normalizedCode)

    const course = await prisma.catalogCourse.findFirst({
      where: { courseCode: { equals: code, mode: 'insensitive' } },
    })

    const node: PrerequisiteNode = {
      courseCode: course?.courseCode ?? normalizedCode,
      title: course?.title ?? normalizedCode,
      credits: course?.creditHoursMin ?? 0,
      prerequisites: [],
    }

    if (course?.prerequisitesRaw) {
      // Extract course codes from prerequisitesRaw
      const matches = course.prerequisitesRaw.match(/[A-Z]{2,4}\s+\d{3}/gi) ?? []
      const uniqueCodes = [...new Set(matches.map((m) => m.toUpperCase()))]
      node.prerequisites = await Promise.all(
        uniqueCodes.map((prereqCode) => buildNode(prereqCode, depth + 1)),
      )
    }

    return node
  }

  return buildNode(courseCode, 0)
}
