import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PipelineStudent {
  id: string
  name: string
  email: string
  program: string
  stage: string
  percentComplete: number
  daysInStage: number
  blockers: string[]
}

export interface PipelineStage {
  key: string
  label: string
  count: number
}

export interface PipelineAlert {
  type: 'warning' | 'success' | 'info'
  message: string
}

export interface GraduationPipelineData {
  term: string
  stages: PipelineStage[]
  students: PipelineStudent[]
  alerts: PipelineAlert[]
}

// ── Stage definitions ────────────────────────────────────────────────────────

const STAGE_DEFS: { key: string; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'audit_running', label: 'Audit Running' },
  { key: 'requirements_met', label: 'Requirements Met' },
  { key: 'holds_check', label: 'Holds Check' },
  { key: 'dean_review', label: 'Dean Review' },
  { key: 'cleared', label: 'Cleared' },
]

// ── Hold simulation (deterministic from student ID, same as Student 360) ────

function simulateHolds(studentId: string): string[] {
  let charSum = 0
  for (let i = 0; i < studentId.length; i++) {
    charSum += studentId.charCodeAt(i)
  }
  const holdCount = charSum % 3 // 0, 1, or 2 holds

  const possibleHolds = [
    'Library fine — $45.00 outstanding',
    'Immunization record not on file',
  ]

  return possibleHolds.slice(0, holdCount)
}

// ── Days since a date ────────────────────────────────────────────────────────

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

// ── Classify a student into a pipeline stage ─────────────────────────────────

function classifyStage(
  petitionStatus: string,
  petitionDecision: string | null,
  auditEntryActions: string[],
  audit: { percentComplete: number; humanReviewRequired: boolean } | null,
  holds: string[],
): string {
  // Cleared — petition approved
  if (petitionDecision === 'APPROVED') return 'cleared'

  // Dean review — IN_REVIEW, 100% complete, no holds
  if (
    petitionStatus === 'IN_REVIEW' &&
    audit &&
    audit.percentComplete >= 100 &&
    holds.length === 0
  ) {
    return 'dean_review'
  }

  // Holds check — has holds and IN_REVIEW
  if (petitionStatus === 'IN_REVIEW' && holds.length > 0) return 'holds_check'

  // Requirements met — audit ≥ 95%, needs human review, not yet decided
  if (
    audit &&
    audit.percentComplete >= 95 &&
    audit.humanReviewRequired &&
    petitionDecision !== 'APPROVED' &&
    petitionDecision !== 'DENIED'
  ) {
    return 'requirements_met'
  }

  // Audit running — ELIGIBILITY_CHECKING or flagged for review
  if (
    petitionStatus === 'ELIGIBILITY_CHECKING' ||
    auditEntryActions.includes('CRON_FLAGGED_FOR_REVIEW')
  ) {
    return 'audit_running'
  }

  // Default — applied
  return 'applied'
}

// ── Main function ────────────────────────────────────────────────────────────

export async function getGraduationPipeline(): Promise<GraduationPipelineData> {
  const petitions = await prisma.petition.findMany({
    where: { type: 'GRADUATION_APPLICATION' },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          program: true,
          sisStudentId: true,
          catalogYear: true,
        },
      },
      auditEntries: {
        select: { action: true, note: true, createdAt: true },
      },
    },
    orderBy: { submittedAt: 'desc' },
  })

  // If no petitions exist, return simulated data
  if (petitions.length === 0) {
    return buildSimulatedData()
  }

  // Look up latest audits for each student in one query
  const studentIds = [...new Set(petitions.map((p) => p.studentId))]
  const audits = await prisma.degreeAuditResult.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      program: { select: { code: true, name: true } },
    },
    orderBy: { auditedAt: 'desc' },
  })

  // Map: studentId → latest audit
  const auditByStudent = new Map<
    string,
    {
      percentComplete: number
      humanReviewRequired: boolean
      totalCreditsCompleted: number
      totalCreditsRequired: number
      programName: string
    }
  >()
  for (const a of audits) {
    if (!auditByStudent.has(a.studentId)) {
      auditByStudent.set(a.studentId, {
        percentComplete: a.percentComplete,
        humanReviewRequired: a.humanReviewRequired,
        totalCreditsCompleted: a.totalCreditsCompleted,
        totalCreditsRequired: a.totalCreditsRequired,
        programName: a.program?.name ?? '',
      })
    }
  }

  // Build student list
  const students: PipelineStudent[] = petitions.map((p) => {
    const holds = simulateHolds(p.studentId)
    const audit = auditByStudent.get(p.studentId) ?? null
    const entryActions = p.auditEntries.map((e) => e.action)

    const stage = classifyStage(p.status, p.decision ?? null, entryActions, audit, holds)

    const blockers: string[] = [...holds]
    if (audit && audit.percentComplete < 100) {
      blockers.push(`${(100 - audit.percentComplete).toFixed(0)}% requirements remaining`)
    }

    return {
      id: p.studentId,
      name: p.student.name ?? p.student.email,
      email: p.student.email,
      program: audit?.programName ?? p.student.program ?? 'Undeclared',
      stage,
      percentComplete: audit?.percentComplete ?? 0,
      daysInStage: daysSince(p.updatedAt),
      blockers,
    }
  })

  // Compute stage counts
  const stageCounts = new Map<string, number>()
  for (const s of students) {
    stageCounts.set(s.stage, (stageCounts.get(s.stage) ?? 0) + 1)
  }
  const stages: PipelineStage[] = STAGE_DEFS.map((d) => ({
    ...d,
    count: stageCounts.get(d.key) ?? 0,
  }))

  // Generate alerts
  const alerts: PipelineAlert[] = buildAlerts(students)

  return { term: 'Spring 2026', stages, students, alerts }
}

// ── Alert generation ─────────────────────────────────────────────────────────

function buildAlerts(students: PipelineStudent[]): PipelineAlert[] {
  const alerts: PipelineAlert[] = []

  // Warning: students stuck in holds_check > 5 days
  const stuckHolds = students.filter((s) => s.stage === 'holds_check' && s.daysInStage > 5)
  if (stuckHolds.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${stuckHolds.length} student${stuckHolds.length > 1 ? 's' : ''} stuck in holds check for more than 5 days`,
    })
  }

  // Info: students at 95-99% (missing one requirement)
  const almostDone = students.filter(
    (s) => s.percentComplete >= 95 && s.percentComplete < 100,
  )
  if (almostDone.length > 0) {
    alerts.push({
      type: 'info',
      message: `${almostDone.length} student${almostDone.length > 1 ? 's' : ''} at 95-99% — likely missing one requirement`,
    })
  }

  // Success: total cleared
  const clearedCount = students.filter((s) => s.stage === 'cleared').length
  if (clearedCount > 0) {
    alerts.push({
      type: 'success',
      message: `${clearedCount} student${clearedCount > 1 ? 's' : ''} cleared for graduation`,
    })
  }

  return alerts
}

// ── Simulated fallback data ──────────────────────────────────────────────────
// Deterministic — no Math.random(). Shows ~18 students across all stages.

function buildSimulatedData(): GraduationPipelineData {
  const simStudents: PipelineStudent[] = [
    // Applied (3)
    { id: 'sim-01', name: 'Marcus Williams', email: 'marcus.williams@uky.edu', program: 'B.S. Computer Science', stage: 'applied', percentComplete: 88, daysInStage: 1, blockers: [] },
    { id: 'sim-02', name: 'Priya Patel', email: 'priya.patel@uky.edu', program: 'B.A. English', stage: 'applied', percentComplete: 92, daysInStage: 0, blockers: [] },
    { id: 'sim-03', name: 'Jordan Lee', email: 'jordan.lee@uky.edu', program: 'B.S. Biology', stage: 'applied', percentComplete: 85, daysInStage: 2, blockers: [] },

    // Audit Running (3)
    { id: 'sim-04', name: 'Aaliyah Johnson', email: 'aaliyah.johnson@uky.edu', program: 'B.S. Nursing', stage: 'audit_running', percentComplete: 94, daysInStage: 1, blockers: [] },
    { id: 'sim-05', name: 'Ethan Clark', email: 'ethan.clark@uky.edu', program: 'B.S. Mechanical Engineering', stage: 'audit_running', percentComplete: 97, daysInStage: 3, blockers: [] },
    { id: 'sim-06', name: 'Sofia Rodriguez', email: 'sofia.rodriguez@uky.edu', program: 'B.A. Psychology', stage: 'audit_running', percentComplete: 91, daysInStage: 2, blockers: [] },

    // Requirements Met (3)
    { id: 'sim-07', name: 'Noah Bennett', email: 'noah.bennett@uky.edu', program: 'B.S. Finance', stage: 'requirements_met', percentComplete: 98, daysInStage: 4, blockers: ['2% requirements remaining'] },
    { id: 'sim-08', name: 'Chloe Nguyen', email: 'chloe.nguyen@uky.edu', program: 'B.A. Political Science', stage: 'requirements_met', percentComplete: 96, daysInStage: 3, blockers: ['4% requirements remaining'] },
    { id: 'sim-09', name: 'Liam Foster', email: 'liam.foster@uky.edu', program: 'J.D. Law', stage: 'requirements_met', percentComplete: 95, daysInStage: 5, blockers: ['5% requirements remaining'] },

    // Holds Check (3)
    { id: 'sim-10', name: 'Emma Sullivan', email: 'emma.sullivan@uky.edu', program: 'B.S. Chemistry', stage: 'holds_check', percentComplete: 100, daysInStage: 7, blockers: ['Library fine — $45.00 outstanding'] },
    { id: 'sim-11', name: 'Aiden Park', email: 'aiden.park@uky.edu', program: 'B.S. Electrical Engineering', stage: 'holds_check', percentComplete: 100, daysInStage: 6, blockers: ['Immunization record not on file'] },
    { id: 'sim-12', name: 'Isabella Kim', email: 'isabella.kim@uky.edu', program: 'B.A. Communication', stage: 'holds_check', percentComplete: 99, daysInStage: 3, blockers: ['Library fine — $45.00 outstanding', '1% requirements remaining'] },

    // Dean Review (3)
    { id: 'sim-13', name: 'Daniel Thompson', email: 'daniel.thompson@uky.edu', program: 'B.S. Accounting', stage: 'dean_review', percentComplete: 100, daysInStage: 2, blockers: [] },
    { id: 'sim-14', name: 'Mia Richardson', email: 'mia.richardson@uky.edu', program: 'B.A. History', stage: 'dean_review', percentComplete: 100, daysInStage: 1, blockers: [] },
    { id: 'sim-15', name: 'William Chen', email: 'william.chen@uky.edu', program: 'B.S. Data Science', stage: 'dean_review', percentComplete: 100, daysInStage: 4, blockers: [] },

    // Cleared (4)
    { id: 'sim-16', name: 'Olivia Martinez', email: 'olivia.martinez@uky.edu', program: 'B.S. Computer Science', stage: 'cleared', percentComplete: 100, daysInStage: 0, blockers: [] },
    { id: 'sim-17', name: 'James Wright', email: 'james.wright@uky.edu', program: 'B.A. Sociology', stage: 'cleared', percentComplete: 100, daysInStage: 1, blockers: [] },
    { id: 'sim-18', name: 'Grace Liu', email: 'grace.liu@uky.edu', program: 'B.S. Nursing', stage: 'cleared', percentComplete: 100, daysInStage: 2, blockers: [] },
  ]

  const stageCounts = new Map<string, number>()
  for (const s of simStudents) {
    stageCounts.set(s.stage, (stageCounts.get(s.stage) ?? 0) + 1)
  }

  const stages: PipelineStage[] = STAGE_DEFS.map((d) => ({
    ...d,
    count: stageCounts.get(d.key) ?? 0,
  }))

  const alerts = buildAlerts(simStudents)

  return { term: 'Spring 2026', stages, students: simStudents, alerts }
}
