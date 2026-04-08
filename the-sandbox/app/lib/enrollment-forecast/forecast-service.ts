import { prisma } from '../prisma'
import { forecastCourseDemand } from './demand-forecaster'
import { recommendRooms } from './room-optimizer'
import type { EnrollmentForecastRecord, ForecastBriefingBlock, RoomRecommendation } from './types'

// ── Single course forecast ──

export async function getForecastForCourse(
  courseCode: string,
  term: string
): Promise<EnrollmentForecastRecord | null> {
  const record = await prisma.enrollmentForecast.findUnique({
    where: { term_courseCode: { term, courseCode } },
  })
  if (!record) return null
  return {
    ...record,
    recommendedRooms: record.recommendedRooms as unknown as RoomRecommendation[],
  }
}

// ── All forecasts for a term ──

export async function getForecastsForTerm(term: string): Promise<EnrollmentForecastRecord[]> {
  const records = await prisma.enrollmentForecast.findMany({
    where: { term },
    orderBy: { capacityGap: 'desc' },
  })
  return records.map((r) => ({
    ...r,
    recommendedRooms: r.recommendedRooms as unknown as RoomRecommendation[],
  }))
}

// ── Top bottleneck courses ──

export async function getBottleneckForecasts(
  term: string,
  limit = 10
): Promise<EnrollmentForecastRecord[]> {
  const records = await prisma.enrollmentForecast.findMany({
    where: { term, riskLevel: { in: ['bottleneck', 'over-capacity'] } },
    orderBy: { capacityGap: 'desc' },
    take: limit,
  })
  return records.map((r) => ({
    ...r,
    recommendedRooms: r.recommendedRooms as unknown as RoomRecommendation[],
  }))
}

// ── Batch compute all forecasts for a term ──

export async function computeAllForecasts(targetTerm: string): Promise<number> {
  // Get all unique course codes from CatalogCourse
  const catalogCourses = await prisma.catalogCourse.findMany({
    select: { courseCode: true },
  })

  const courseCodes = catalogCourses.map((c) => c.courseCode)
  let upserted = 0

  // Process in batches of 20 to avoid overwhelming the DB
  const BATCH_SIZE = 20
  for (let i = 0; i < courseCodes.length; i += BATCH_SIZE) {
    const batch = courseCodes.slice(i, i + BATCH_SIZE)

    const results = await Promise.all(
      batch.map(async (courseCode) => {
        const demand = await forecastCourseDemand(courseCode, targetTerm)
        const rooms = await recommendRooms(demand.predictedEnrollment, demand.predictedSections)

        return prisma.enrollmentForecast.upsert({
          where: { term_courseCode: { term: targetTerm, courseCode } },
          create: {
            term: targetTerm,
            courseCode,
            degreeAuditDemand: demand.degreeAuditDemand,
            historicalAvg: demand.historicalAvg,
            historicalTrend: demand.historicalTrend,
            waitlistHistory: demand.waitlistHistory,
            prerequisitesPassed: demand.prerequisitesPassed,
            predictedEnrollment: demand.predictedEnrollment,
            predictedSections: demand.predictedSections,
            confidenceLevel: demand.confidenceLevel,
            riskLevel: demand.riskLevel,
            recommendedRooms: JSON.parse(JSON.stringify(rooms)),
            currentCapacity: demand.currentCapacity,
            capacityGap: demand.capacityGap,
          },
          update: {
            computedAt: new Date(),
            degreeAuditDemand: demand.degreeAuditDemand,
            historicalAvg: demand.historicalAvg,
            historicalTrend: demand.historicalTrend,
            waitlistHistory: demand.waitlistHistory,
            prerequisitesPassed: demand.prerequisitesPassed,
            predictedEnrollment: demand.predictedEnrollment,
            predictedSections: demand.predictedSections,
            confidenceLevel: demand.confidenceLevel,
            riskLevel: demand.riskLevel,
            recommendedRooms: JSON.parse(JSON.stringify(rooms)),
            currentCapacity: demand.currentCapacity,
            capacityGap: demand.capacityGap,
          },
        })
      })
    )

    upserted += results.length
  }

  return upserted
}

// ── Briefing integration hook ──

export async function buildForecastBriefingBlock(
  term: string
): Promise<ForecastBriefingBlock | null> {
  const bottlenecks = await getBottleneckForecasts(term, 5)

  if (bottlenecks.length === 0) return null

  return {
    type: 'enrollment-bottleneck',
    title: `${bottlenecks.length} Enrollment Bottleneck${bottlenecks.length > 1 ? 's' : ''} — ${term}`,
    summary: `${bottlenecks.length} course${bottlenecks.length > 1 ? 's' : ''} predicted to exceed capacity. Largest gap: ${bottlenecks[0].courseCode} needs ${bottlenecks[0].capacityGap} more seats.`,
    items: bottlenecks.map((b) => ({
      courseCode: b.courseCode,
      predictedEnrollment: b.predictedEnrollment,
      currentCapacity: b.currentCapacity,
      capacityGap: b.capacityGap,
    })),
  }
}
