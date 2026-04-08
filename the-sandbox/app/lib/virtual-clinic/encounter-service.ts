import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import { extractDomainMarkers, extractManeuverMarkers } from './marker-utils'
import type { EncounterPhase, TranscriptMessage, DifferentialEntry, DiagnosticPlanInput, AffectState, SelfAssessment, PhaseTimingData } from './types'

// ─── Phase FSM ───────────────────────────────────────────────────────────────

const PHASE_ORDER: EncounterPhase[] = [
  'OPENING',
  'HISTORY_TAKING',
  'PROBLEM_REPRESENTATION',
  'DIFFERENTIAL_DIAGNOSIS',
  'PHYSICAL_EXAM',
  'DIAGNOSTIC_PLAN',
  'FEEDBACK',
  'COMPLETED',
]

function nextPhase(current: EncounterPhase): EncounterPhase | null {
  const idx = PHASE_ORDER.indexOf(current)
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1]
}

// ─── Artifact → required phase mapping ───────────────────────────────────────

const ARTIFACT_PHASE_MAP: Record<string, EncounterPhase> = {
  problem_representation: 'PROBLEM_REPRESENTATION',
  differential_list: 'DIFFERENTIAL_DIAGNOSIS',
  diagnostic_plan: 'DIAGNOSTIC_PLAN',
}

// ─── Service Functions ───────────────────────────────────────────────────────

export async function startEncounter(
  caseId: string,
  userId: string,
  courseId?: string | null,
  isPracticeRetry?: boolean,
) {
  const clinicalCase = await prisma.clinicalCase.findUnique({ where: { id: caseId } })
  if (!clinicalCase) throw Object.assign(new Error('Case not found'), { status: 404 })
  if (!clinicalCase.published) throw Object.assign(new Error('Case is not published'), { status: 400 })

  return prisma.clinicalEncounter.create({
    data: {
      caseId,
      userId,
      courseId: courseId ?? null,
      isPracticeRetry: isPracticeRetry ?? false,
      phase: 'OPENING',
      transcript: [] as Prisma.InputJsonValue,
      historyDomainsHit: {
        __phaseTimestamps: { phaseEnteredAt: { OPENING: new Date().toISOString() } },
      } as Prisma.InputJsonValue,
      examManeuversRequested: [],
    },
  })
}

export async function getEncounter(encounterId: string) {
  const encounter = await prisma.clinicalEncounter.findUnique({
    where: { id: encounterId },
    include: { clinicalCase: true },
  })
  if (!encounter) throw Object.assign(new Error('Encounter not found'), { status: 404 })
  return encounter
}

export async function advancePhase(encounterId: string, userId: string) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) throw Object.assign(new Error('Encounter not found'), { status: 404 })
  if (encounter.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const next = nextPhase(encounter.phase as EncounterPhase)
  if (!next) throw Object.assign(new Error('Cannot advance past COMPLETED'), { status: 400 })

  // Record phase timing
  const existing = (encounter.historyDomainsHit ?? {}) as Record<string, unknown>
  const timingData = (existing.__phaseTimestamps ?? { phaseEnteredAt: {} }) as PhaseTimingData
  timingData.phaseEnteredAt[next] = new Date().toISOString()

  const data: Prisma.ClinicalEncounterUncheckedUpdateInput = {
    phase: next,
    historyDomainsHit: { ...existing, __phaseTimestamps: timingData } as unknown as Prisma.InputJsonValue,
  }
  if (next === 'COMPLETED') {
    data.completedAt = new Date()
    data.status = 'COMPLETED'
  }

  return prisma.clinicalEncounter.update({ where: { id: encounterId }, data })
}

export async function saveArtifact(
  encounterId: string,
  userId: string,
  artifactType: 'problem_representation' | 'differential_list' | 'diagnostic_plan',
  artifactData: unknown,
) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) throw Object.assign(new Error('Encounter not found'), { status: 404 })
  if (encounter.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const requiredPhase = ARTIFACT_PHASE_MAP[artifactType]
  if (encounter.phase !== requiredPhase) {
    throw Object.assign(
      new Error(`Artifact "${artifactType}" can only be saved during ${requiredPhase} phase`),
      { status: 400 },
    )
  }

  const data: Prisma.ClinicalEncounterUncheckedUpdateInput = {}

  switch (artifactType) {
    case 'problem_representation':
      data.problemRepresentation = artifactData as string
      break
    case 'differential_list':
      data.differentialDiagnosis = artifactData as unknown as Prisma.InputJsonValue
      break
    case 'diagnostic_plan':
      data.diagnosticPlan = artifactData as unknown as Prisma.InputJsonValue
      break
  }

  return prisma.clinicalEncounter.update({ where: { id: encounterId }, data })
}

// ─── Withdraw ───────────────────────────────────────────────────────────────

export async function withdrawEncounter(encounterId: string, userId: string) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) throw Object.assign(new Error('Encounter not found'), { status: 404 })
  if (encounter.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  if (encounter.status === 'COMPLETED') throw Object.assign(new Error('Cannot withdraw a completed encounter'), { status: 400 })
  if (encounter.status === 'ABANDONED') throw Object.assign(new Error('Encounter already abandoned'), { status: 400 })

  return prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: { status: 'ABANDONED' },
  })
}

// ─── Transcript helpers ──────────────────────────────────────────────────────

export async function appendToTranscript(
  encounterId: string,
  message: TranscriptMessage,
) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) throw Object.assign(new Error('Encounter not found'), { status: 404 })

  const transcript = (encounter.transcript as unknown ?? []) as TranscriptMessage[]
  transcript.push(message)

  return prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: { transcript: transcript as unknown as Prisma.InputJsonValue },
  })
}

export async function updateTrackingMarkers(
  encounterId: string,
  aiResponse: string,
) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) return

  // Extract domain and maneuver markers from AI response
  const newDomains = extractDomainMarkers(aiResponse)
  const domains = (encounter.historyDomainsHit ?? {}) as Record<string, boolean>
  for (const d of newDomains) {
    domains[d] = true
  }

  const newManeuvers = extractManeuverMarkers(aiResponse)
  const maneuvers = [...encounter.examManeuversRequested]
  for (const m of newManeuvers) {
    if (!maneuvers.includes(m)) maneuvers.push(m)
  }

  await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      historyDomainsHit: domains as Prisma.InputJsonValue,
      examManeuversRequested: maneuvers,
    },
  })
}

// ─── Affect State ───────────────────────────────────────────────────────────

/**
 * Store the current affect state in the encounter's historyDomainsHit Json field
 * under an '__affectState' key (transient, overwritten each exchange).
 */
export async function updateAffectState(
  encounterId: string,
  affect: AffectState,
) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) return

  const existing = (encounter.historyDomainsHit ?? {}) as Record<string, unknown>
  await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      historyDomainsHit: { ...existing, __affectState: affect } as unknown as Prisma.InputJsonValue,
    },
  })
}

export function getAffectState(encounter: { historyDomainsHit: unknown }): AffectState | null {
  const data = encounter.historyDomainsHit as Record<string, unknown> | null
  if (!data || !data.__affectState) return null
  return data.__affectState as AffectState
}

// ─── Phase Timing ──────────────────────────────────────────────────────────

export function getPhaseTimingData(encounter: { historyDomainsHit: unknown }): PhaseTimingData | null {
  const data = encounter.historyDomainsHit as Record<string, unknown> | null
  if (!data || !data.__phaseTimestamps) return null
  return data.__phaseTimestamps as PhaseTimingData
}

// ─── Self-Assessment ───────────────────────────────────────────────────────

export async function saveSelfAssessment(
  encounterId: string,
  userId: string,
  assessment: SelfAssessment,
) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) throw Object.assign(new Error('Encounter not found'), { status: 404 })
  if (encounter.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const existing = (encounter.historyDomainsHit ?? {}) as Record<string, unknown>
  const existingScores = (encounter.scores ?? {}) as Record<string, unknown>

  await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      historyDomainsHit: { ...existing, __selfAssessment: assessment } as unknown as Prisma.InputJsonValue,
      // Also persist in scores JSON so the client can read it
      scores: { ...existingScores, selfAssessment: assessment } as unknown as Prisma.InputJsonValue,
    },
  })
}

export function getSelfAssessment(encounter: { historyDomainsHit: unknown }): SelfAssessment | null {
  const data = encounter.historyDomainsHit as Record<string, unknown> | null
  if (!data || !data.__selfAssessment) return null
  return data.__selfAssessment as SelfAssessment
}

// ─── Pending Clinic Assignments ─────────────────────────────────────────────

export interface PendingClinicAssignment {
  id: string
  title: string
  dueAt: Date | null
  clinicalCaseId: string
  /** Whether the student has started (but not necessarily completed) an encounter */
  started: boolean
  /** Whether the student has completed an encounter */
  completed: boolean
}

/**
 * Get Virtual Clinic assignments for a student that haven't been completed.
 * Shared by briefing-service and proactive-suggestions.
 *
 * @param userId    Student user ID
 * @param courseIds Enrolled course IDs
 * @param opts.dueBefore  Only return assignments due before this date
 * @param opts.dueAfter   Only return assignments due after this date
 * @param opts.limit      Max assignments to return
 */
export async function getPendingClinicAssignments(
  userId: string,
  courseIds: string[],
  opts?: { dueBefore?: Date; dueAfter?: Date; limit?: number },
): Promise<PendingClinicAssignment[]> {
  if (courseIds.length === 0) return []

  const dueAtFilter: Record<string, Date> = {}
  if (opts?.dueAfter) dueAtFilter.gte = opts.dueAfter
  if (opts?.dueBefore) dueAtFilter.lte = opts.dueBefore

  const assignments = await prisma.assignment.findMany({
    where: {
      courseId: { in: courseIds },
      type: 'VIRTUAL_CLINIC',
      isPublished: true,
      clinicalCaseId: { not: null },
      dueAt: Object.keys(dueAtFilter).length > 0 ? dueAtFilter : { not: null },
    },
    select: { id: true, title: true, dueAt: true, clinicalCaseId: true },
    ...(opts?.limit ? { take: opts.limit } : {}),
  })

  if (assignments.length === 0) return []

  const caseIds = assignments.map(a => a.clinicalCaseId!).filter(Boolean)
  const encounters = await prisma.clinicalEncounter.findMany({
    where: { userId, caseId: { in: caseIds } },
    select: { caseId: true, completedAt: true },
  })

  const encounterMap = new Map<string, { started: boolean; completed: boolean }>()
  for (const e of encounters) {
    encounterMap.set(e.caseId, {
      started: true,
      completed: e.completedAt !== null,
    })
  }

  return assignments
    .map(a => ({
      id: a.id,
      title: a.title,
      dueAt: a.dueAt,
      clinicalCaseId: a.clinicalCaseId!,
      started: encounterMap.get(a.clinicalCaseId!)?.started ?? false,
      completed: encounterMap.get(a.clinicalCaseId!)?.completed ?? false,
    }))
    .filter(a => !a.completed)
}

// ─── Student Notes ─────────────────────────────────────────────────────────

export async function saveNotes(
  encounterId: string,
  userId: string,
  notes: string,
) {
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) throw Object.assign(new Error('Encounter not found'), { status: 404 })
  if (encounter.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const existing = (encounter.historyDomainsHit ?? {}) as Record<string, unknown>

  await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      historyDomainsHit: { ...existing, __notes: notes } as unknown as Prisma.InputJsonValue,
    },
  })
}

export function getNotes(encounter: { historyDomainsHit: unknown }): string {
  const data = encounter.historyDomainsHit as Record<string, unknown> | null
  if (!data || typeof data.__notes !== 'string') return ''
  return data.__notes
}
