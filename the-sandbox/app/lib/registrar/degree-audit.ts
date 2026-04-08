import { prisma } from '../prisma'
import { getSISAdapter } from '../sis'
import type { CompletedCourse, EnrolledCourse } from '../sis'
import type {
  DegreeAuditResultPayload,
  RequirementAuditResult,
  AuditStep,
  AuditSource,
} from './types'
import { generateAuditSummary } from './audit-summary'
import type { DegreeRequirement, RequirementCourse } from '../../generated/prisma'

type RequirementWithCourses = DegreeRequirement & { courses: RequirementCourse[] }

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, ' ').trim().toUpperCase()
}

function gradeIsCredit(grade: string): boolean {
  // W, I, WF, E, F do not count toward requirements
  return !['W', 'I', 'WF', 'E', 'F', 'AU'].includes(grade.toUpperCase())
}

function evaluateRequirement(
  req: RequirementWithCourses,
  history: CompletedCourse[],
  enrollment: EnrolledCourse[],
  steps: AuditStep[],
): RequirementAuditResult {
  const requiredCodes = new Set(req.courses.filter((c) => c.isRequired).map((c) => normalizeCode(c.courseCode)))
  const optionalCodes = new Set(req.courses.map((c) => normalizeCode(c.courseCode)))

  // Pattern matching (e.g. "ENG 4*" matches any 400-level ENG)
  const matchesPattern = (courseCode: string): boolean => {
    const normalized = normalizeCode(courseCode)
    return req.coursePatterns.some((pattern) => {
      const regexStr = pattern.replace(/\*/g, '\\d+')
      try {
        return new RegExp(`^${regexStr}$`).test(normalized)
      } catch {
        return false
      }
    })
  }

  const satisfying: string[] = []
  let creditsCompleted = 0
  let creditsInProgress = 0

  // Count completed courses
  for (const course of history) {
    const code = normalizeCode(course.courseCode)
    if ((optionalCodes.has(code) || matchesPattern(code)) && gradeIsCredit(course.grade)) {
      satisfying.push(`${course.courseCode} (${course.grade})`)
      creditsCompleted += course.credits
    }
  }

  // Count in-progress enrollment
  for (const course of enrollment) {
    const code = normalizeCode(course.courseCode)
    if ((optionalCodes.has(code) || matchesPattern(code)) && course.status === 'ENROLLED') {
      if (!satisfying.some((s) => s.startsWith(course.courseCode))) {
        creditsInProgress += course.credits
      }
    }
  }

  // Check required courses
  const missing: string[] = []
  for (const code of requiredCodes) {
    const found = satisfying.some((s) => normalizeCode(s.split(' (')[0]) === code)
    if (!found) {
      const courseInfo = req.courses.find((c) => normalizeCode(c.courseCode) === code)
      if (courseInfo) missing.push(`${courseInfo.courseCode} — ${courseInfo.courseName}`)
    }
  }

  const creditsMet = creditsCompleted >= req.minCredits
  const requiredCoursesMet = missing.length === 0
  const minCoursesMet = !req.minCourses || satisfying.length >= req.minCourses

  let status: RequirementAuditResult['status']
  if (creditsMet && requiredCoursesMet && minCoursesMet) {
    status = 'SATISFIED'
  } else if (creditsCompleted + creditsInProgress >= req.minCredits) {
    status = 'IN_PROGRESS'
  } else if (creditsCompleted > 0 || satisfying.length > 0) {
    status = 'IN_PROGRESS'
  } else {
    status = 'NOT_STARTED'
  }

  steps.push({
    step: steps.length + 1,
    description: `Checking requirement: ${req.name}`,
    outcome: status === 'SATISFIED' ? 'PASS' : status === 'IN_PROGRESS' ? 'WARN' : 'FAIL',
    detail: `${creditsCompleted}/${req.minCredits} credits completed. ${satisfying.length} qualifying course(s).`,
  })

  return {
    requirementId: req.id,
    requirementName: req.name,
    category: req.category,
    status,
    creditsRequired: req.minCredits,
    creditsCompleted,
    creditsInProgress,
    satisfyingCourses: satisfying,
    missingSuggestions: missing,
    notes: req.notes ?? undefined,
  }
}

export async function runDegreeAudit(
  studentId: string,
  programCode: string,
  catalogYear: string,
): Promise<DegreeAuditResultPayload & { programId: string }> {
  const sis = await getSISAdapter()
  const steps: AuditStep[] = []
  const sources: AuditSource[] = []

  steps.push({ step: 1, description: 'Fetching student academic record from SIS', outcome: 'INFO' })

  // Fetch student data
  const [profile, history, transfers, enrollment] = await Promise.all([
    sis.getStudentProfile(studentId),
    sis.getCourseHistory(studentId),
    sis.getTransferCredits(studentId),
    sis.getCurrentEnrollment(studentId, 'Spring 2026'),
  ])

  sources.push({ type: 'TRANSCRIPT', description: `${history.length} completed course(s) on record` })
  if (transfers.length > 0) {
    sources.push({ type: 'TRANSFER', description: `${transfers.length} transfer credit evaluation(s) on file` })
  }
  if (enrollment.length > 0) {
    sources.push({ type: 'ENROLLMENT', description: `${enrollment.length} course(s) currently enrolled` })
  }

  steps.push({
    step: 2,
    description: `Retrieved ${history.length} completed courses, ${enrollment.length} in-progress`,
    outcome: 'INFO',
    detail: `Total credits on transcript: ${history.filter((c) => gradeIsCredit(c.grade)).reduce((s, c) => s + c.credits, 0)}`,
  })

  // Check for complex-case flags
  const hasWithdrawals = history.some((c) => c.grade === 'W')
  const hasIncompletes = history.some((c) => c.grade === 'I')
  const hasTransfer = transfers.length > 0
  const complexCaseFlag = hasWithdrawals || hasIncompletes || hasTransfer

  if (complexCaseFlag) {
    steps.push({
      step: 3,
      description: 'Complex case flag triggered',
      outcome: 'WARN',
      detail: [
        hasWithdrawals && 'Course withdrawals on record',
        hasIncompletes && 'Incomplete grades on record',
        hasTransfer && 'Transfer credits require verification',
      ]
        .filter(Boolean)
        .join('; '),
    })
  }

  // Look up degree program from DB
  let program = await prisma.degreeProgram.findUnique({
    where: { code_catalogYear: { code: programCode, catalogYear } },
    include: { requirements: { include: { courses: true } } },
  })

  // Fallback: find by code only (any catalog year)
  if (!program) {
    const fallback = await prisma.degreeProgram.findFirst({
      where: { code: programCode },
      include: { requirements: { include: { courses: true } } },
      orderBy: { createdAt: 'desc' },
    })
    program = fallback
  }

  if (!program) {
    // Return a stub result — no program data seeded yet
    const totalCredits = history.filter((c) => gradeIsCredit(c.grade)).reduce((s, c) => s + c.credits, 0)
    const payload: DegreeAuditResultPayload & { programId: string } = {
      programId: 'unknown',
      overallStatus: 'REVIEW_REQUIRED',
      percentComplete: 0,
      totalCreditsCompleted: totalCredits,
      totalCreditsRequired: 120,
      requirementResults: [],
      recommendedActions: [
        'Meet with your academic advisor to review your degree requirements.',
        'Contact the Registrar\'s Office to ensure your program data is loaded.',
      ],
      citedSources: sources,
      chainOfThought: [
        ...steps,
        { step: steps.length + 1, description: 'Degree program data not found in system', outcome: 'WARN', detail: `No program found for code=${programCode} catalogYear=${catalogYear}` },
      ],
      confidenceScore: 20,
      complexCaseFlag,
      humanReviewRequired: true,
    }
    return payload
  }

  sources.push({ type: 'CATALOG', description: `${program.name} — Catalog Year ${program.catalogYear}` })

  // Evaluate each requirement
  const requirementResults: RequirementAuditResult[] = program.requirements.map((req) =>
    evaluateRequirement(req as RequirementWithCourses, history, enrollment, steps),
  )

  const totalCompleted = history
    .filter((c) => gradeIsCredit(c.grade))
    .reduce((s, c) => s + c.credits, 0)

  const satisfiedCount = requirementResults.filter((r) => r.status === 'SATISFIED').length
  const percentComplete = program.requirements.length > 0
    ? Math.round((satisfiedCount / program.requirements.length) * 100)
    : 0

  const allSatisfied = requirementResults.every((r) => r.status === 'SATISFIED')
  const anyDeficient = requirementResults.some((r) => r.status === 'NOT_STARTED' && totalCompleted > 10)

  let overallStatus: DegreeAuditResultPayload['overallStatus']
  if (allSatisfied) {
    overallStatus = 'ON_TRACK'
  } else if (complexCaseFlag || anyDeficient) {
    overallStatus = 'ACTION_NEEDED'
  } else {
    overallStatus = 'ACTION_NEEDED'
  }

  const humanReviewRequired = complexCaseFlag || percentComplete < 20

  // Confidence: reduce for complexity and missing data
  let confidenceScore = 90
  if (hasWithdrawals) confidenceScore -= 10
  if (hasIncompletes) confidenceScore -= 15
  if (hasTransfer) confidenceScore -= 10
  if (program.requirements.length === 0) confidenceScore -= 40
  confidenceScore = Math.max(10, confidenceScore)

  const { recommendedActions } = await generateAuditSummary(requirementResults, profile, program.name)

  return {
    programId: program.id,
    overallStatus,
    percentComplete,
    totalCreditsCompleted: totalCompleted,
    totalCreditsRequired: program.totalCredits,
    requirementResults,
    recommendedActions,
    citedSources: sources,
    chainOfThought: steps,
    confidenceScore,
    complexCaseFlag,
    humanReviewRequired,
  }
}
