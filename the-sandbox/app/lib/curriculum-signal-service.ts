/**
 * curriculum-signal-service.ts
 *
 * Aggregates TransferEvents into curriculum-level signals for admins.
 * Identifies strong concept pathways across courses.
 */

import { prisma } from './prisma'

export type CurriculumSignal = {
  concept: string
  sourceCourse: { id: string; code: string; name: string }
  targetCourse: { id: string; code: string; name: string }
  transferCount: number
  enrolledInTarget: number
  transferRate: number
  avgScore: number
  tier: 'strong' | 'notable'
}

type CacheEntry = {
  data: { signals: CurriculumSignal[]; totalEvents: number; generatedAt: string }
  ts: number
}

// Module-level cache — 1-hour TTL
const signalCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000

export function invalidateCurriculumSignalCache(): void {
  signalCache.clear()
}

export async function getCurriculumSignals(): Promise<{
  signals: CurriculumSignal[]
  totalEvents: number
  generatedAt: string
}> {
  const cacheKey = 'global'
  const cached = signalCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  // Enrollment counts per course
  const enrollmentRows = await prisma.courseEnrollment.groupBy({
    by: ['courseId'],
    _count: { studentId: true },
  })
  const enrollmentByCourseid = new Map<string, number>()
  for (const row of enrollmentRows) {
    enrollmentByCourseid.set(row.courseId, row._count.studentId)
  }

  // Transfer aggregation via raw SQL
  type TransferAggRow = {
    concept: string
    source_course_id: string
    target_course_id: string
    transfer_count: bigint
    avg_score: number
  }

  const aggRows = await prisma.$queryRaw<TransferAggRow[]>`
    SELECT
      LOWER(TRIM(te.concept)) AS concept,
      te."sourceCourseId" AS source_course_id,
      te."targetCourseId" AS target_course_id,
      COUNT(DISTINCT te."userId") AS transfer_count,
      AVG(te."sessionScore") AS avg_score
    FROM "TransferEvent" te
    GROUP BY LOWER(TRIM(te.concept)), te."sourceCourseId", te."targetCourseId"
    HAVING COUNT(DISTINCT te."userId") >= 5
    ORDER BY COUNT(DISTINCT te."userId") DESC
  `

  // Fetch all involved courses
  const courseIds = new Set<string>()
  for (const row of aggRows) {
    courseIds.add(row.source_course_id)
    courseIds.add(row.target_course_id)
  }
  const courses = await prisma.course.findMany({
    where: { id: { in: [...courseIds] } },
    select: { id: true, courseCode: true, title: true },
  })
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  const signals: CurriculumSignal[] = []
  let totalEvents = 0

  for (const row of aggRows) {
    const transferCount = Number(row.transfer_count)
    const enrolledInTarget = enrollmentByCourseid.get(row.target_course_id) ?? 0
    if (enrolledInTarget === 0) continue

    const transferRate = transferCount / enrolledInTarget
    if (transferRate < 0.3) continue

    const sourceCourseRaw = courseMap.get(row.source_course_id)
    const targetCourseRaw = courseMap.get(row.target_course_id)
    if (!sourceCourseRaw || !targetCourseRaw) continue

    const tier: 'strong' | 'notable' =
      transferCount >= 10 && transferRate >= 0.5 ? 'strong' : 'notable'

    signals.push({
      concept: row.concept,
      sourceCourse: { id: sourceCourseRaw.id, code: sourceCourseRaw.courseCode, name: sourceCourseRaw.title },
      targetCourse: { id: targetCourseRaw.id, code: targetCourseRaw.courseCode, name: targetCourseRaw.title },
      transferCount,
      enrolledInTarget,
      transferRate: Math.round(transferRate * 1000) / 1000,
      avgScore: Math.round(row.avg_score * 100) / 100,
      tier,
    })

    totalEvents += transferCount
  }

  const result = {
    signals,
    totalEvents,
    generatedAt: new Date().toISOString(),
  }

  signalCache.set(cacheKey, { data: result, ts: Date.now() })
  return result
}
