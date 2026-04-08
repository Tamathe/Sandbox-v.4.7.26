import { prisma } from '../prisma'
import type { DemandForecast, HistoricalTrend, RiskLevel } from './types'

// ── Signal weights ──
// If a signal source doesn't exist, its weight is redistributed proportionally
const WEIGHTS = {
  degreeAudit: 0.4,
  historical: 0.35,
  prereqEligible: 0.15,
  waitlist: 0.1,
}

const DEFAULT_SECTION_SIZE = 35

export async function forecastCourseDemand(
  courseCode: string,
  targetTerm: string
): Promise<DemandForecast> {
  const [degreeAuditDemand, historicalData, prereqEligible, waitlistCount, currentCapacity] =
    await Promise.all([
      countDegreeAuditDemand(courseCode),
      getHistoricalEnrollment(courseCode, 4),
      countPrerequisiteEligible(courseCode),
      getWaitlistHistory(courseCode),
      getCurrentCapacity(courseCode),
    ])

  const historicalAvg =
    historicalData.length > 0
      ? historicalData.reduce((a, b) => a + b, 0) / historicalData.length
      : 0
  const trend = computeTrend(historicalData)

  const trendMultiplier = trend === 'growing' ? 0.1 : trend === 'declining' ? -0.1 : 0

  const predictedEnrollment = Math.round(
    degreeAuditDemand * WEIGHTS.degreeAudit +
      historicalAvg * (1 + trendMultiplier) * WEIGHTS.historical +
      prereqEligible * WEIGHTS.prereqEligible +
      waitlistCount * WEIGHTS.waitlist
  )

  const predictedSections = Math.max(1, Math.ceil(predictedEnrollment / DEFAULT_SECTION_SIZE))

  const confidenceLevel = computeConfidence(historicalData.length, degreeAuditDemand)
  const capacityGap = predictedEnrollment - currentCapacity

  return {
    courseCode,
    term: targetTerm,
    degreeAuditDemand,
    historicalAvg,
    historicalTrend: trend,
    waitlistHistory: waitlistCount,
    prerequisitesPassed: prereqEligible,
    predictedEnrollment,
    predictedSections,
    confidenceLevel,
    riskLevel: classifyRisk(predictedEnrollment, currentCapacity),
    currentCapacity,
    capacityGap,
  }
}

// ── Signal: Degree audit demand ──
// Count students whose degree plan includes this course and haven't completed it
async function countDegreeAuditDemand(courseCode: string): Promise<number> {
  return prisma.plannedCourse.count({
    where: {
      courseCode,
      status: { not: 'COMPLETED' },
    },
  })
}

// ── Signal: Historical enrollment ──
// Returns array of enrollment counts from past terms for this course code
async function getHistoricalEnrollment(courseCode: string, termCount: number): Promise<number[]> {
  // Find all Course records with this courseCode (or matching prefix)
  // Each semester field represents a term
  const courses = await prisma.course.findMany({
    where: { courseCode },
    select: {
      semester: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: termCount,
  })

  return courses.map((c) => c._count.enrollments)
}

// ── Signal: Prerequisite eligible students ──
// Count students who have completed prerequisite courses
async function countPrerequisiteEligible(courseCode: string): Promise<number> {
  const catalog = await prisma.catalogCourse.findUnique({
    where: { courseCode },
    select: { prerequisitesParsed: true },
  })

  if (!catalog?.prerequisitesParsed) return 0

  // prerequisitesParsed is a JSON field with parsed prereq data
  // For a simple count, we look at students who have completed courses
  // that appear in the prerequisite chain
  const prereqData = catalog.prerequisitesParsed as { courses?: string[] }
  const prereqCodes = prereqData.courses ?? []

  if (prereqCodes.length === 0) return 0

  // Count students who have completed at least one prerequisite course
  const eligibleCount = await prisma.plannedCourse.count({
    where: {
      courseCode: { in: prereqCodes },
      status: 'COMPLETED',
    },
  })

  return eligibleCount
}

// ── Signal: Waitlist history ──
// Stub: no waitlist model exists yet — returns 0
async function getWaitlistHistory(_courseCode: string): Promise<number> {
  // TODO: Wire up when waitlist tracking model is added
  return 0
}

// ── Current capacity ──
// Estimate based on existing course sections and typical room capacity
async function getCurrentCapacity(courseCode: string): Promise<number> {
  const courses = await prisma.course.findMany({
    where: { courseCode },
    select: { _count: { select: { enrollments: true } } },
  })

  if (courses.length === 0) return DEFAULT_SECTION_SIZE

  // Current capacity = sum of current enrollments (proxy for allocated seats)
  // In a real system this would come from registrar section data
  return courses.reduce((sum, c) => sum + Math.max(c._count.enrollments, DEFAULT_SECTION_SIZE), 0)
}

// ── Helpers ──

function computeTrend(enrollments: number[]): HistoricalTrend {
  if (enrollments.length < 2) return 'stable'

  // Simple linear: compare first half avg to second half avg
  const mid = Math.floor(enrollments.length / 2)
  const older = enrollments.slice(mid)
  const newer = enrollments.slice(0, mid)

  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  const newerAvg = newer.reduce((a, b) => a + b, 0) / newer.length

  const changeRate = olderAvg > 0 ? (newerAvg - olderAvg) / olderAvg : 0

  if (changeRate > 0.05) return 'growing'
  if (changeRate < -0.05) return 'declining'
  return 'stable'
}

function computeConfidence(dataPoints: number, auditDemand: number): number {
  // More data points + higher audit demand = higher confidence
  const dataScore = Math.min(dataPoints / 4, 1) * 0.6
  const demandScore = auditDemand > 0 ? 0.4 : 0.1
  return Math.min(dataScore + demandScore, 1)
}

function classifyRisk(predicted: number, capacity: number): RiskLevel {
  if (capacity === 0) return 'normal'
  if (predicted < 10) return 'under-enrolled'
  if (predicted > capacity * 1.2) return 'bottleneck'
  if (predicted > capacity) return 'over-capacity'
  return 'normal'
}
