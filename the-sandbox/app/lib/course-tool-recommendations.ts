import { prisma } from './prisma'

/**
 * Course-specific tool recommendations for faculty homepage.
 *
 * Matches marketplace tools to educator's current course modules using:
 *  1. Category/keyword match against module topics
 *  2. Department adoption (tools popular in educator's department)
 *  3. Platform popularity fallback
 */

export interface CourseToolRecommendation {
  courseId: string
  courseCode: string
  courseTitle: string
  currentModule: string | null
  moduleObjectives: string[]
  recommendedTools: Array<{
    toolId: string
    name: string
    shortDescription: string | null
    category: string
    rating: number
    useCount: number
    matchReason: string
    departmentAdoption: number
    forkedFromId: string | null
  }>
}

function avgRating(ratings: { rating: number }[]): number {
  if (ratings.length === 0) return 0
  return Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
}

async function fetchToolDetails(toolIds: string[]) {
  if (toolIds.length === 0) return new Map<string, { rating: number; useCount: number; forkedFromId: string | null }>()

  const tools = await prisma.tool.findMany({
    where: { id: { in: toolIds } },
    select: {
      id: true,
      forkedFromId: true,
      ratings: { select: { rating: true }, take: 100 },
      _count: { select: { sessions: true } },
    },
  })

  return new Map(tools.map(t => [t.id, {
    rating: avgRating(t.ratings),
    useCount: t._count.sessions,
    forkedFromId: t.forkedFromId,
  }]))
}

export async function getCourseToolRecommendations(
  userId: string,
): Promise<CourseToolRecommendation[]> {
  // 1. Get educator's courses
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
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
            select: {
              id: true,
              title: true,
              objectives: { select: { title: true } },
            },
          },
        },
      },
    },
  })

  if (courses.length === 0) return []

  // 2. Find current module per course (rough heuristic based on weeks into semester)
  const semesterStartApprox = new Date()
  semesterStartApprox.setMonth(semesterStartApprox.getMonth() - 2)
  const weeksSinceStart = Math.max(1, Math.floor((Date.now() - semesterStartApprox.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  // 3. Get educator's department for adoption signals
  const departmentMemberships = await prisma.departmentMember.findMany({
    where: { userId },
    select: { departmentId: true },
  })
  const deptIds = departmentMemberships.map(m => m.departmentId)

  // 4. Get tools already used or created by this educator (exclude from recommendations)
  const [usedSessions, ownedTools] = await Promise.all([
    prisma.toolSession.findMany({
      where: { userId },
      select: { toolId: true },
      distinct: ['toolId'],
    }),
    prisma.tool.findMany({
      where: { creatorId: userId },
      select: { id: true },
    }),
  ])

  const excludeIds = [...new Set([
    ...usedSessions.map(s => s.toolId),
    ...ownedTools.map(t => t.id),
  ])]

  const results: CourseToolRecommendation[] = []

  for (const course of courses) {
    // Pick current module
    const currentWeekIndex = Math.min(weeksSinceStart - 1, course.weeks.length - 1)
    const currentWeek = course.weeks[currentWeekIndex] ?? course.weeks[0]
    const moduleObjectives = currentWeek?.materials
      .flatMap(m => m.objectives.map(o => o.title))
      .filter(Boolean) ?? []

    // Build search keywords from course title, module title, and objectives
    const keywords = [
      course.title,
      course.courseCode,
      currentWeek?.title,
      ...moduleObjectives,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)

    const uniqueKeywords = [...new Set(keywords)].slice(0, 15)

    const recommendedTools: CourseToolRecommendation['recommendedTools'] = []
    const seen = new Set<string>()

    // Strategy 1: Category/keyword match
    if (uniqueKeywords.length > 0) {
      const keywordConditions = uniqueKeywords.slice(0, 5).map(kw => ({
        OR: [
          { name: { contains: kw, mode: 'insensitive' as const } },
          { shortDescription: { contains: kw, mode: 'insensitive' as const } },
          { category: { contains: kw, mode: 'insensitive' as const } },
        ],
      }))

      const matched = await prisma.tool.findMany({
        where: {
          published: true,
          approvalStatus: 'APPROVED',
          id: { notIn: excludeIds },
          OR: keywordConditions,
        },
        select: { id: true, name: true, shortDescription: true, category: true },
        take: 6,
        orderBy: { sessions: { _count: 'desc' } },
      })

      const details = await fetchToolDetails(matched.map(t => t.id))

      for (const tool of matched) {
        if (seen.has(tool.id) || recommendedTools.length >= 3) break
        seen.add(tool.id)
        const d = details.get(tool.id)
        recommendedTools.push({
          toolId: tool.id,
          name: tool.name,
          shortDescription: tool.shortDescription,
          category: tool.category,
          rating: d?.rating ?? 0,
          useCount: d?.useCount ?? 0,
          matchReason: 'Matches course topics',
          departmentAdoption: 0,
          forkedFromId: d?.forkedFromId ?? null,
        })
      }
    }

    // Strategy 2: Department adoption
    if (recommendedTools.length < 3 && deptIds.length > 0) {
      const deptCollectionTools = await prisma.collectionTool.findMany({
        where: {
          collection: { departmentId: { in: deptIds } },
          toolId: { notIn: [...excludeIds, ...seen] },
          tool: { published: true, approvalStatus: 'APPROVED' },
        },
        select: {
          tool: { select: { id: true, name: true, shortDescription: true, category: true } },
        },
        take: 3 - recommendedTools.length,
      })

      const deptToolIds = deptCollectionTools.map(ct => ct.tool.id)
      const details = await fetchToolDetails(deptToolIds)

      for (const ct of deptCollectionTools) {
        const tool = ct.tool
        if (seen.has(tool.id) || recommendedTools.length >= 3) break
        seen.add(tool.id)
        const d = details.get(tool.id)
        recommendedTools.push({
          toolId: tool.id,
          name: tool.name,
          shortDescription: tool.shortDescription,
          category: tool.category,
          rating: d?.rating ?? 0,
          useCount: d?.useCount ?? 0,
          matchReason: 'Popular in your department',
          departmentAdoption: d?.useCount ?? 0,
          forkedFromId: d?.forkedFromId ?? null,
        })
      }
    }

    // Strategy 3: Platform-wide popular fallback
    if (recommendedTools.length < 3) {
      const popular = await prisma.tool.findMany({
        where: {
          published: true,
          approvalStatus: 'APPROVED',
          id: { notIn: [...excludeIds, ...seen] },
        },
        select: { id: true, name: true, shortDescription: true, category: true },
        take: 3 - recommendedTools.length,
        orderBy: { sessions: { _count: 'desc' } },
      })

      const details = await fetchToolDetails(popular.map(t => t.id))

      for (const tool of popular) {
        if (seen.has(tool.id) || recommendedTools.length >= 3) break
        seen.add(tool.id)
        const d = details.get(tool.id)
        recommendedTools.push({
          toolId: tool.id,
          name: tool.name,
          shortDescription: tool.shortDescription,
          category: tool.category,
          rating: d?.rating ?? 0,
          useCount: d?.useCount ?? 0,
          matchReason: 'Popular on campus',
          departmentAdoption: 0,
          forkedFromId: d?.forkedFromId ?? null,
        })
      }
    }

    results.push({
      courseId: course.id,
      courseCode: course.courseCode,
      courseTitle: course.title,
      currentModule: currentWeek?.title ?? null,
      moduleObjectives,
      recommendedTools,
    })
  }

  return results
}
