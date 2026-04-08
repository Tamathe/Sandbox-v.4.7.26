import { prisma } from '../prisma'
import { getSISAdapter } from '../sis'
import type { StudentProfile, CompletedCourse, EnrolledCourse, AcademicStanding } from '../sis'
import type { RequirementAuditResult } from './types'

// ── Hold simulation ──────────────────────────────────────────────────────────

const HOLD_POOL = [
  { type: 'FINANCIAL', description: 'Financial Hold — Outstanding balance of $1,240' },
  { type: 'ADVISING', description: 'Advising Hold — Must complete advising appointment before registration' },
  { type: 'IMMUNIZATION', description: 'Immunization Hold — Missing required immunization records' },
] as const

export interface SimulatedHold {
  type: string
  description: string
}

function hashStudentId(id: string): number {
  let sum = 0
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i)
  }
  return sum
}

function getSimulatedHolds(studentId: string): SimulatedHold[] {
  const hash = hashStudentId(studentId)
  const count = hash % 3 // 0, 1, or 2 holds
  const holds: SimulatedHold[] = []
  for (let i = 0; i < count; i++) {
    holds.push({ ...HOLD_POOL[(hash + i) % HOLD_POOL.length] })
  }
  return holds
}

// ── Sandy summary generation (template-based, no LLM) ───────────────────────

function generateSandySummary(data: {
  profile: StudentProfile
  audit: { overallStatus: string; percentComplete: number; requirementResults: RequirementAuditResult[] } | null
  petitions: { type: string; status: string }[]
  holds: SimulatedHold[]
  enrollment: EnrolledCourse[]
}): string {
  const { profile, audit, petitions, holds, enrollment } = data
  const parts: string[] = []

  // Opening line
  parts.push(`${profile.name} is a ${profile.program} student in the ${profile.college} with a ${profile.gpa.toFixed(2)} GPA (${profile.totalCreditsEarned} credits earned).`)

  // Degree progress
  if (audit) {
    const pct = Math.round(audit.percentComplete)
    if (audit.overallStatus === 'ON_TRACK') {
      parts.push(`Degree progress is on track at ${pct}% complete.`)
    } else if (audit.overallStatus === 'ACTION_NEEDED') {
      const deficient = audit.requirementResults.filter(r => r.status === 'DEFICIENT')
      parts.push(`Degree progress is at ${pct}% but action is needed${deficient.length > 0 ? ` — ${deficient.length} requirement(s) are deficient` : ''}.`)
    } else {
      parts.push(`Degree audit is at ${pct}% and has been flagged for review.`)
    }
  } else {
    parts.push('No degree audit on file yet.')
  }

  // Petitions
  const activePetitions = petitions.filter(p => !['APPROVED', 'DENIED', 'WITHDRAWN'].includes(p.status))
  if (activePetitions.length > 0) {
    parts.push(`${activePetitions.length} active petition(s) in progress.`)
  }

  // Holds
  if (holds.length > 0) {
    parts.push(`⚠ ${holds.length} hold(s) on record that may block registration.`)
  }

  // Enrollment
  if (enrollment.length > 0) {
    const enrolled = enrollment.filter(e => e.status === 'ENROLLED')
    const totalCredits = enrolled.reduce((sum, e) => sum + e.credits, 0)
    parts.push(`Currently enrolled in ${enrolled.length} course(s) for ${totalCredits} credits this term.`)
  }

  // Academic standing
  if (profile.academicStanding !== 'GOOD') {
    parts.push(`Academic standing: ${profile.academicStanding} — may require intervention.`)
  }

  return parts.join(' ')
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Student360Petition {
  id: string
  type: string
  status: string
  submittedAt: string
  decision: string | null
}

export interface Student360Audit {
  id: string
  overallStatus: string
  percentComplete: number
  totalCreditsCompleted: number
  totalCreditsRequired: number
  requirementResults: RequirementAuditResult[]
  recommendedActions: string[]
  confidenceScore: number
  complexCaseFlag: boolean
  humanReviewRequired: boolean
  staffReviewedAt: string | null
  auditedAt: string
  program: { code: string; name: string } | null
}

export interface Student360Data {
  studentId: string
  profile: StudentProfile
  academicStanding: AcademicStanding
  courseHistory: CompletedCourse[]
  currentEnrollment: EnrolledCourse[]
  audit: Student360Audit | null
  petitions: Student360Petition[]
  holds: SimulatedHold[]
  sandySummary: string
}

// ── Main service function ────────────────────────────────────────────────────

export async function getStudent360(studentId: string): Promise<Student360Data> {
  // 1. Fetch user from Prisma with petitions
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      petitions: {
        orderBy: { submittedAt: 'desc' },
      },
    },
  })

  if (!user) {
    throw new Error(`Student not found: ${studentId}`)
  }

  const sisId = user.sisStudentId ?? user.id

  // 2. Get SIS data
  const sis = await getSISAdapter()
  const currentTerm = 'Spring 2026'

  const [profile, courseHistory, currentEnrollment, academicStanding] = await Promise.all([
    sis.getStudentProfile(sisId),
    sis.getCourseHistory(sisId),
    sis.getCurrentEnrollment(sisId, currentTerm),
    sis.getAcademicStanding(sisId),
  ])

  // 3. Fetch latest DegreeAuditResult
  const latestAudit = await prisma.degreeAuditResult.findFirst({
    where: { studentId },
    include: { program: { select: { code: true, name: true } } },
    orderBy: { auditedAt: 'desc' },
  })

  const audit: Student360Audit | null = latestAudit
    ? {
        id: latestAudit.id,
        overallStatus: latestAudit.overallStatus,
        percentComplete: latestAudit.percentComplete,
        totalCreditsCompleted: latestAudit.totalCreditsCompleted,
        totalCreditsRequired: latestAudit.totalCreditsRequired,
        requirementResults: latestAudit.requirementResults as unknown as RequirementAuditResult[],
        recommendedActions: latestAudit.recommendedActions as unknown as string[],
        confidenceScore: latestAudit.confidenceScore,
        complexCaseFlag: latestAudit.complexCaseFlag,
        humanReviewRequired: latestAudit.humanReviewRequired,
        staffReviewedAt: latestAudit.staffReviewedAt?.toISOString() ?? null,
        auditedAt: latestAudit.auditedAt.toISOString(),
        program: latestAudit.program ? { code: latestAudit.program.code, name: latestAudit.program.name } : null,
      }
    : null

  // 4. Simulate holds deterministically
  const holds = getSimulatedHolds(studentId)

  // 5. Map petitions
  const petitions: Student360Petition[] = (user.petitions ?? []).map(p => ({
    id: p.id,
    type: p.type,
    status: p.status,
    submittedAt: p.submittedAt.toISOString(),
    decision: p.decision ?? null,
  }))

  // 6. Generate Sandy summary
  const sandySummary = generateSandySummary({
    profile,
    audit: audit
      ? {
          overallStatus: audit.overallStatus,
          percentComplete: audit.percentComplete,
          requirementResults: audit.requirementResults,
        }
      : null,
    petitions: petitions.map(p => ({ type: p.type, status: p.status })),
    holds,
    enrollment: currentEnrollment,
  })

  return {
    studentId,
    profile,
    academicStanding,
    courseHistory,
    currentEnrollment,
    audit,
    petitions,
    holds,
    sandySummary,
  }
}
