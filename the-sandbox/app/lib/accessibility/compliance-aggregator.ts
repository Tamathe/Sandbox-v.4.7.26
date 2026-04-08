/**
 * ADA Compliance — Compliance Aggregator Service
 *
 * Aggregates AccessibilityReport data into summaries at three levels:
 * - University-wide (ADMIN)
 * - Department (STAFF)
 * - Course (EDUCATOR)
 *
 * Powers the Compliance Dashboard and Sandy's `compliance_report` tool.
 */

import { prisma } from '../prisma'
// AccessibilityGrade used in ComplianceSummary type references


// ── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceSummary {
  totalContentItems: number
  scannedItems: number
  complianceRate: number           // % scoring B or above
  gradeDistribution: Record<string, number>

  byType: Array<{
    type: string
    total: number
    scanned: number
    avgScore: number
    gradeDistribution: Record<string, number>
  }>

  byDepartment: Array<{
    department: string
    totalMaterials: number
    avgScore: number
    compliance: number
    topIssue: string
  }>

  weeklyTrend: Array<{
    week: string
    avgScore: number
    newItems: number
    remediatedItems: number
  }>

  highImpactQueue: Array<{
    targetType: string
    targetId: string
    title: string
    courseName: string
    enrollment: number
    grade: string
    topIssues: string[]
    autoFixableCount: number
  }>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyGrades(): Record<string, number> {
  return { A: 0, B: 0, C: 0, D: 0, F: 0 }
}

function compliancePercent(grades: Record<string, number>): number {
  const total = Object.values(grades).reduce((s, n) => s + n, 0)
  if (total === 0) return 100
  const compliant = (grades.A ?? 0) + (grades.B ?? 0)
  return Math.round((compliant / total) * 100)
}

function topIssueFromReports(
  reports: Array<{ issues: unknown }>,
): string {
  const counts: Record<string, number> = {}
  for (const r of reports) {
    const issues = r.issues as Array<{ type: string }> | null
    if (!Array.isArray(issues)) continue
    for (const issue of issues) {
      counts[issue.type] = (counts[issue.type] ?? 0) + 1
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0]?.replace(/-/g, ' ') ?? 'none'
}

function isoWeek(date: Date): string {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// ── Main aggregation ─────────────────────────────────────────────────────────

/**
 * Get compliance summary at university, department, or course scope.
 */
export async function getComplianceSummary(
  scope: 'university' | 'department' | 'course',
  scopeId?: string,
): Promise<ComplianceSummary> {
  // ── Fetch all reports (scoped) ──
  const reportWhere = scope === 'course' && scopeId
    ? { targetType: 'course_material', targetId: { in: await getMaterialIdsForCourse(scopeId) } }
    : scope === 'department' && scopeId
      ? { targetType: 'course_material', targetId: { in: await getMaterialIdsForDepartment(scopeId) } }
      : {} // university-wide

  const reports = await prisma.accessibilityReport.findMany({
    where: reportWhere,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      overallScore: true,
      overallGrade: true,
      issues: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { overallScore: 'asc' },
  })

  // ── Grade distribution ──
  const gradeDistribution = emptyGrades()
  for (const r of reports) {
    gradeDistribution[r.overallGrade] = (gradeDistribution[r.overallGrade] ?? 0) + 1
  }

  // ── Total content items (scoped) ──
  const totalContentItems = scope === 'course' && scopeId
    ? await prisma.courseMaterial.count({ where: { courseId: scopeId } })
    : scope === 'department' && scopeId
      ? await prisma.courseMaterial.count({ where: { course: { courseCode: { startsWith: scopeId } } } })
      : await prisma.courseMaterial.count()

  const scannedItems = reports.length
  const complianceRate = compliancePercent(gradeDistribution)

  // ── By content type ──
  const typeGroups = new Map<string, typeof reports>()
  for (const r of reports) {
    const group = typeGroups.get(r.targetType) ?? []
    group.push(r)
    typeGroups.set(r.targetType, group)
  }

  const byType = Array.from(typeGroups.entries()).map(([type, items]) => {
    const grades = emptyGrades()
    let totalScore = 0
    for (const item of items) {
      grades[item.overallGrade] = (grades[item.overallGrade] ?? 0) + 1
      totalScore += item.overallScore
    }
    return {
      type,
      total: items.length,
      scanned: items.length,
      avgScore: items.length > 0 ? Math.round((totalScore / items.length) * 100) / 100 : 1,
      gradeDistribution: grades,
    }
  })

  // ── By department (derive from course code prefix) ──
  const byDepartment = await buildDepartmentBreakdown(reports)

  // ── Weekly trend (last 12 weeks) ──
  const weeklyTrend = buildWeeklyTrend(reports)

  // ── High-impact remediation queue ──
  const highImpactQueue = await buildHighImpactQueue(reports)

  return {
    totalContentItems,
    scannedItems,
    complianceRate,
    gradeDistribution,
    byType,
    byDepartment,
    weeklyTrend,
    highImpactQueue,
  }
}

// ── Helper: get material IDs for a course ────────────────────────────────────

async function getMaterialIdsForCourse(courseId: string): Promise<string[]> {
  const materials = await prisma.courseMaterial.findMany({
    where: { courseId },
    select: { id: true },
  })
  return materials.map((m) => m.id)
}

async function getMaterialIdsForDepartment(deptPrefix: string): Promise<string[]> {
  const materials = await prisma.courseMaterial.findMany({
    where: { course: { courseCode: { startsWith: deptPrefix } } },
    select: { id: true },
  })
  return materials.map((m) => m.id)
}

// ── Department breakdown ─────────────────────────────────────────────────────

async function buildDepartmentBreakdown(
  reports: Array<{ targetId: string; overallScore: number; overallGrade: string; issues: unknown }>,
): Promise<ComplianceSummary['byDepartment']> {
  if (reports.length === 0) return []

  // Map targetId → courseCode via CourseMaterial → Course
  const materialIds = reports
    .filter((r) => r.overallGrade) // only course_material reports have valid grades
    .map((r) => r.targetId)

  if (materialIds.length === 0) return []

  const materials = await prisma.courseMaterial.findMany({
    where: { id: { in: materialIds.slice(0, 500) } },
    select: { id: true, course: { select: { courseCode: true } } },
  })

  const materialToCourseCode = new Map(materials.map((m) => [m.id, m.course.courseCode]))

  // Group by department prefix (e.g. "ENG" from "ENG-101")
  const deptMap = new Map<string, Array<{ score: number; grade: string; issues: unknown }>>()

  for (const r of reports) {
    const courseCode = materialToCourseCode.get(r.targetId)
    if (!courseCode) continue
    const dept = courseCode.split(/[-\s]/)[0] ?? 'OTHER'
    const group = deptMap.get(dept) ?? []
    group.push({ score: r.overallScore, grade: r.overallGrade, issues: r.issues })
    deptMap.set(dept, group)
  }

  return Array.from(deptMap.entries())
    .map(([dept, items]) => {
      const grades = emptyGrades()
      let totalScore = 0
      for (const item of items) {
        grades[item.grade] = (grades[item.grade] ?? 0) + 1
        totalScore += item.score
      }
      return {
        department: dept,
        totalMaterials: items.length,
        avgScore: Math.round((totalScore / items.length) * 100) / 100,
        compliance: compliancePercent(grades),
        topIssue: topIssueFromReports(items),
      }
    })
    .sort((a, b) => a.avgScore - b.avgScore) // Worst departments first
}

// ── Weekly trend ─────────────────────────────────────────────────────────────

function buildWeeklyTrend(
  reports: Array<{ overallScore: number; createdAt: Date; updatedAt: Date }>,
): ComplianceSummary['weeklyTrend'] {
  const now = new Date()
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)

  const weekMap = new Map<string, { scores: number[]; newCount: number; remediatedCount: number }>()

  // Initialize last 12 weeks
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const week = isoWeek(d)
    if (!weekMap.has(week)) {
      weekMap.set(week, { scores: [], newCount: 0, remediatedCount: 0 })
    }
  }

  for (const r of reports) {
    const createdWeek = isoWeek(r.createdAt)
    const updatedWeek = isoWeek(r.updatedAt)

    if (r.createdAt >= twelveWeeksAgo) {
      const entry = weekMap.get(createdWeek)
      if (entry) {
        entry.newCount++
        entry.scores.push(r.overallScore)
      }
    }

    if (r.updatedAt > r.createdAt && r.updatedAt >= twelveWeeksAgo) {
      const entry = weekMap.get(updatedWeek)
      if (entry) entry.remediatedCount++
    }
  }

  return Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      avgScore: data.scores.length > 0
        ? Math.round((data.scores.reduce((s, n) => s + n, 0) / data.scores.length) * 100) / 100
        : 0,
      newItems: data.newCount,
      remediatedItems: data.remediatedCount,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

// ── High-impact remediation queue ────────────────────────────────────────────

async function buildHighImpactQueue(
  reports: Array<{ targetType: string; targetId: string; overallGrade: string; issues: unknown }>,
): Promise<ComplianceSummary['highImpactQueue']> {
  // Only items with D/F grades
  const problemReports = reports.filter((r) => r.overallGrade === 'D' || r.overallGrade === 'F')
  if (problemReports.length === 0) return []

  const materialIds = problemReports
    .filter((r) => r.targetType === 'course_material')
    .map((r) => r.targetId)

  if (materialIds.length === 0) return []

  const materials = await prisma.courseMaterial.findMany({
    where: { id: { in: materialIds.slice(0, 100) } },
    select: {
      id: true,
      title: true,
      course: {
        select: {
          title: true,
          courseCode: true,
          _count: { select: { enrollments: true } },
        },
      },
    },
  })

  const materialMap = new Map(materials.map((m) => [m.id, m]))

  return problemReports
    .filter((r) => materialMap.has(r.targetId))
    .map((r) => {
      const mat = materialMap.get(r.targetId)!
      const issues = (r.issues as Array<{ type: string; autoFixable: boolean }>) ?? []
      const issueTypes = [...new Set(issues.map((i) => i.type.replace(/-/g, ' ')))]
      const autoFixableCount = issues.filter((i) => i.autoFixable).length

      const impact = mat.course._count.enrollments * (r.overallGrade === 'F' ? 2 : 1)
      return {
        targetType: r.targetType,
        targetId: r.targetId,
        title: mat.title,
        courseName: `${mat.course.courseCode} ${mat.course.title}`,
        enrollment: mat.course._count.enrollments,
        grade: r.overallGrade,
        topIssues: issueTypes.slice(0, 3),
        autoFixableCount,
        impact,
      }
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 20)
    .map((item) => ({
      targetType: item.targetType,
      targetId: item.targetId,
      title: item.title,
      courseName: item.courseName,
      enrollment: item.enrollment,
      grade: item.grade,
      topIssues: item.topIssues,
      autoFixableCount: item.autoFixableCount,
    }))
}

/**
 * Quick stats for Sandy context injection — lightweight, no full aggregation.
 */
export async function getQuickComplianceStats(): Promise<{
  totalScanned: number
  complianceRate: number
  criticalCount: number
}> {
  const reports = await prisma.accessibilityReport.findMany({
    select: { overallGrade: true },
  })

  const total = reports.length
  if (total === 0) return { totalScanned: 0, complianceRate: 100, criticalCount: 0 }

  const compliant = reports.filter((r) => r.overallGrade === 'A' || r.overallGrade === 'B').length
  const critical = reports.filter((r) => r.overallGrade === 'F').length

  return {
    totalScanned: total,
    complianceRate: Math.round((compliant / total) * 100),
    criticalCount: critical,
  }
}
