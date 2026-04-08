import Anthropic from '@anthropic-ai/sdk'
import type {
  AssignmentType,
  GateStatus as PrismaGateStatus,
  Prisma,
} from '../../generated/prisma'
import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import { getConceptMasteries, upsertConceptMastery } from '../concept-mastery-service'
import { computeNextReview, getDueConcepts } from '../sr-scheduler'
import { scoreSubmission } from '../grading-service'
import {
  assignmentSupportsAssessmentMode,
  extractAssessmentModeConfig,
} from './assessment-canvas'
import {
  createEvidence,
  refreshGradebookEvidenceSummary,
  updateEvidenceScoring,
} from './evidence-service'
import {
  clampUnit,
  type GapType,
  type MasteryGapDiagnosis,
  type MasteryGateAnswerPayload,
  type MasteryGateAttemptDetail,
  type MasteryGateAttemptSummary,
  type MasteryGateCard,
  type MasteryGateConceptReadiness,
  type MasteryGateDesignInput,
  type MasteryGateDetailPayload,
  type MasteryGateObjectiveOption,
  type MasteryGateProgressPayload,
  type MasteryGateQuestionRecord,
  type MasteryGateStartPayload,
} from './types'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const QUESTIONS_PER_CONCEPT = 2
const FINALIZED_GRADEBOOK_STATUSES = new Set(['APPROVED', 'RELEASED'])

const BLOOM_LABELS = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
] as const

type Viewer = {
  id: string
  role: string
}

type GateAttemptRow = {
  id: string
  gateId: string
  status: PrismaGateStatus
  attemptNumber: number
  totalQuestions: number
  correctCount: number
  overallScore: number | null
  startedAt: Date
  completedAt: Date | null
  questionsAsked: Prisma.JsonValue
  gapDiagnosis: Prisma.JsonValue | null
  masteryByConceptJson: Prisma.JsonValue
}

type GateRow = {
  id: string
  courseId: string
  weekId: string | null
  title: string
  description: string | null
  concepts: string[]
  bloomFloor: number
  passThreshold: number
  maxAttempts: number
  cooldownHours: number
  orderIndex: number
  unlocksWeekId: string | null
  unlocksGateId: string | null
  isPublished: boolean
  week: {
    id: string
    title: string
    weekNumber: number
  } | null
  attempts: GateAttemptRow[]
}

type LinkedAssignmentRow = {
  id: string
  title: string
  weekId: string | null
  assessmentMode: string
  assessmentConfig: Prisma.JsonValue | null
  isPublished: boolean
  type: AssignmentType
  rubricId: string | null
  pointsPossible: number
}

type AttemptConceptProgress = Record<
  string,
  {
    score: number
    attempts: number
    gaps: string[]
    highestBloom: number
  }
>

type GateAvailability = {
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'PASSED' | 'FAILED_RETRY'
  available: boolean
  availabilityReason: string | null
  nextAvailableAt: Date | null
  latestAttempt: GateAttemptRow | null
  activeAttempt: GateAttemptRow | null
  attemptCount: number
}

type CourseAccess = {
  id: string
  title: string
  courseCode: string
  instructorId: string
  isPublic: boolean
  weeks: Array<{ id: string; title: string; weekNumber: number }>
}

function createHttpError(message: string, status: number) {
  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}


function roundUnit(value: number | null | undefined, fallback = 0): number {
  return Math.round((clampUnit(value) ?? fallback) * 1000) / 1000
}

function normalizeConceptKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function getBloomLabel(level: number): string {
  return BLOOM_LABELS[Math.max(1, Math.min(6, Math.round(level))) - 1]
}

function extractTextContent(blocks: Anthropic.Messages.ContentBlock[]): string {
  return blocks
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

function extractJsonObject(rawText: string): string | null {
  const match = rawText.match(/\{[\s\S]*\}/)
  return match?.[0] ?? null
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  retryableStatusCodes = [429, 500, 503, 529]
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (status !== undefined && !retryableStatusCodes.includes(status)) {
        throw error
      }

      lastError = error
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
      }
    }
  }

  throw lastError
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 2 &&
        !['with', 'that', 'this', 'from', 'into', 'about', 'your', 'their', 'have', 'what'].includes(
          token
        )
    )
}

function parseQuestions(value: Prisma.JsonValue | null | undefined): MasteryGateQuestionRecord[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item): MasteryGateQuestionRecord | null => {
      if (!item || typeof item !== 'object') return null
      const question =
        typeof (item as { question?: unknown }).question === 'string'
          ? (item as { question: string }).question.trim()
          : ''
      const concept =
        typeof (item as { concept?: unknown }).concept === 'string'
          ? (item as { concept: string }).concept.trim()
          : ''
      const expectedAnswer =
        typeof (item as { expectedAnswer?: unknown }).expectedAnswer === 'string'
          ? (item as { expectedAnswer: string }).expectedAnswer.trim()
          : ''
      const bloomLevel = Number((item as { bloomLevel?: unknown }).bloomLevel)

      if (!question || !concept || !expectedAnswer || !Number.isFinite(bloomLevel)) {
        return null
      }

      return {
        concept,
        bloomLevel: Math.max(1, Math.min(6, Math.round(bloomLevel))),
        question,
        expectedAnswer,
        studentAnswer:
          typeof (item as { studentAnswer?: unknown }).studentAnswer === 'string'
            ? (item as { studentAnswer: string }).studentAnswer
            : undefined,
        isCorrect:
          typeof (item as { isCorrect?: unknown }).isCorrect === 'boolean'
            ? (item as { isCorrect: boolean }).isCorrect
            : undefined,
        feedback:
          typeof (item as { feedback?: unknown }).feedback === 'string'
            ? (item as { feedback: string }).feedback
            : undefined,
        gapType:
          typeof (item as { gapType?: unknown }).gapType === 'string'
            ? ((item as { gapType: GapType | 'none' }).gapType as GapType | 'none')
            : undefined,
        answeredAt:
          typeof (item as { answeredAt?: unknown }).answeredAt === 'string'
            ? (item as { answeredAt: string }).answeredAt
            : undefined,
      }
    })
    .filter((item): item is MasteryGateQuestionRecord => item != null)
}

function parseGapDiagnosis(
  value: Prisma.JsonValue | null | undefined
): MasteryGapDiagnosis[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const concept =
        typeof (item as { concept?: unknown }).concept === 'string'
          ? (item as { concept: string }).concept.trim()
          : ''
      const gapType =
        typeof (item as { gapType?: unknown }).gapType === 'string'
          ? ((item as { gapType: GapType }).gapType as GapType)
          : null
      const explanation =
        typeof (item as { explanation?: unknown }).explanation === 'string'
          ? (item as { explanation: string }).explanation.trim()
          : ''
      const recommendation =
        typeof (item as { recommendation?: unknown }).recommendation === 'string'
          ? (item as { recommendation: string }).recommendation.trim()
          : ''
      const practiceMode =
        typeof (item as { practiceMode?: unknown }).practiceMode === 'string'
          ? ((item as {
              practiceMode: MasteryGapDiagnosis['practiceMode']
            }).practiceMode as MasteryGapDiagnosis['practiceMode'])
          : null
      const practiceHref =
        typeof (item as { practiceHref?: unknown }).practiceHref === 'string'
          ? (item as { practiceHref: string }).practiceHref
          : ''

      if (!concept || !gapType || !explanation || !recommendation || !practiceMode || !practiceHref) {
        return null
      }

      return {
        concept,
        gapType,
        explanation,
        recommendation,
        practiceMode,
        practiceHref,
      }
    })
    .filter((item): item is MasteryGapDiagnosis => item != null)
}

function parseMasteryByConcept(value: Prisma.JsonValue | null | undefined): AttemptConceptProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const output: AttemptConceptProgress = {}
  for (const [key, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const score = Number((raw as { score?: unknown }).score)
    const attempts = Number((raw as { attempts?: unknown }).attempts)
    const highestBloom = Number((raw as { highestBloom?: unknown }).highestBloom)
    const gaps = Array.isArray((raw as { gaps?: unknown }).gaps)
      ? (raw as { gaps: unknown[] }).gaps.filter((item): item is string => typeof item === 'string')
      : []

    output[key] = {
      score: Number.isFinite(score) ? score : 0,
      attempts: Number.isFinite(attempts) ? attempts : 0,
      gaps,
      highestBloom: Number.isFinite(highestBloom) ? highestBloom : 0,
    }
  }

  return output
}

function serializeAttemptSummary(attempt: GateAttemptRow): MasteryGateAttemptSummary {
  return {
    id: attempt.id,
    gateId: attempt.gateId,
    status: attempt.status as MasteryGateAttemptSummary['status'],
    attemptNumber: attempt.attemptNumber,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount,
    overallScore: attempt.overallScore,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
  }
}

function serializeAttemptDetail(attempt: GateAttemptRow): MasteryGateAttemptDetail {
  return {
    ...serializeAttemptSummary(attempt),
    questions: parseQuestions(attempt.questionsAsked),
    gapDiagnosis: parseGapDiagnosis(attempt.gapDiagnosis),
  }
}

function modeForGapType(gapType: GapType): MasteryGapDiagnosis['practiceMode'] {
  switch (gapType) {
    case 'misconception':
      return 'socratic'
    case 'knowledge_gap':
      return 'tutor'
    case 'transfer_failure':
      return 'quiz'
    case 'procedural':
      return 'flashcards'
    case 'recall_decay':
      return 'flashcards'
    default:
      return 'tutor'
  }
}

function buildPracticeHref(courseId: string, gapType: GapType, concept: string): string {
  const mode = modeForGapType(gapType)
  return `/study?courseId=${encodeURIComponent(courseId)}&mode=${encodeURIComponent(
    mode
  )}&concept=${encodeURIComponent(concept)}`
}

function buildRecommendation(gapType: GapType, concept: string): string {
  switch (gapType) {
    case 'misconception':
      return `Your explanation suggests a mental model mismatch around ${concept}. Work through it in Socratic mode so Sandy can surface exactly where your reasoning diverges.`
    case 'knowledge_gap':
      return `You need a stronger foundation for ${concept}. Start with Tutor mode for a clean explanation, then restate it in your own words.`
    case 'transfer_failure':
      return `You know the idea behind ${concept}, but applying it under pressure is still shaky. Use Quiz mode to practice moving from principle to decision.`
    case 'procedural':
      return `You are close on ${concept}, but the steps are slipping. Flashcards and structured repetition should tighten the sequence.`
    case 'recall_decay':
      return `This looks more like faded recall than a missing idea. A quick flashcard review on ${concept} should bring it back.`
    default:
      return `Spend one focused Study Buddy session on ${concept} before retrying this gate.`
  }
}

function gateSummaryText(input: {
  gate: Pick<GateRow, 'title' | 'concepts'>
  attempt: MasteryGateAttemptDetail
}): string {
  const lines = [
    `[Mastery gate] ${input.gate.title}`,
    '',
    `Status: ${input.attempt.status}`,
    `Score: ${input.attempt.correctCount}/${Math.max(1, input.attempt.totalQuestions)}`,
    `Overall score: ${Math.round((input.attempt.overallScore ?? 0) * 100)}%`,
    `Concepts: ${input.gate.concepts.join(', ')}`,
    '',
    'Questions and responses:',
  ]

  for (const [index, question] of input.attempt.questions.entries()) {
    lines.push(`${index + 1}. ${question.question}`)
    lines.push(`Student answer: ${question.studentAnswer ?? '(no answer recorded)'}`)
    lines.push(`Correct: ${question.isCorrect ? 'yes' : 'no'}`)
    if (question.feedback) {
      lines.push(`Feedback: ${question.feedback}`)
    }
    lines.push('')
  }

  if (input.attempt.gapDiagnosis.length > 0) {
    lines.push('Gap diagnosis:')
    for (const gap of input.attempt.gapDiagnosis) {
      lines.push(`- ${gap.concept}: ${gap.gapType} - ${gap.recommendation}`)
    }
  }

  return lines.join('\n').trim()
}

function parseAssignmentGateId(
  assignment: Pick<LinkedAssignmentRow, 'assessmentMode' | 'assessmentConfig'>
): string | null {
  return (
    extractAssessmentModeConfig(
      {
        assessmentMode: assignment.assessmentMode,
        assessmentConfig: assignment.assessmentConfig,
      },
      'MASTERY_GATE'
    ).gateId ?? null
  )
}

function findLinkedAssignment(
  gate: Pick<GateRow, 'id' | 'weekId'>,
  assignments: LinkedAssignmentRow[]
): LinkedAssignmentRow | null {
  const explicit = assignments.find(
    (assignment) => parseAssignmentGateId(assignment) === gate.id
  )
  if (explicit) return explicit

  if (gate.weekId) {
    const sameWeek = assignments.find((assignment) => assignment.weekId === gate.weekId)
    if (sameWeek) return sameWeek
  }

  return assignments.length === 1 ? assignments[0] : null
}

function formatWeekLabel(week: { title: string; weekNumber: number } | null): string | null {
  if (!week) return null
  return `Week ${week.weekNumber}: ${week.title}`
}

function canDesignCourse(viewer: Viewer, course: Pick<CourseAccess, 'instructorId'>): boolean {
  return viewer.role === 'ADMIN' || (viewer.role === 'EDUCATOR' && course.instructorId === viewer.id)
}

function canAttemptCourse(viewer: Viewer, course: Pick<CourseAccess, 'instructorId'>): boolean {
  return (
    viewer.role === 'ADMIN' ||
    viewer.role === 'STUDENT' ||
    (viewer.role === 'EDUCATOR' && course.instructorId === viewer.id)
  )
}

async function requireCourseAccess(viewer: Viewer, courseId: string): Promise<CourseAccess> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      courseCode: true,
      instructorId: true,
      isPublic: true,
      weeks: {
        select: {
          id: true,
          title: true,
          weekNumber: true,
        },
        orderBy: { weekNumber: 'asc' },
      },
      enrollments:
        viewer.role === 'STUDENT'
          ? {
              where: { studentId: viewer.id },
              select: { id: true },
              take: 1,
            }
          : false,
    },
  })

  if (!course) {
    throw createHttpError('Course not found', 404)
  }

  if (viewer.role === 'ADMIN') {
    return {
      id: course.id,
      title: course.title,
      courseCode: course.courseCode,
      instructorId: course.instructorId,
      isPublic: course.isPublic,
      weeks: course.weeks,
    }
  }

  if (viewer.role === 'EDUCATOR') {
    if (course.instructorId !== viewer.id) {
      throw createHttpError('Forbidden', 403)
    }
    return {
      id: course.id,
      title: course.title,
      courseCode: course.courseCode,
      instructorId: course.instructorId,
      isPublic: course.isPublic,
      weeks: course.weeks,
    }
  }

  const hasEnrollment = Array.isArray(course.enrollments) && course.enrollments.length > 0
  if (!course.isPublic && !hasEnrollment) {
    throw createHttpError('Forbidden', 403)
  }

  return {
    id: course.id,
    title: course.title,
    courseCode: course.courseCode,
    instructorId: course.instructorId,
    isPublic: course.isPublic,
    weeks: course.weeks,
  }
}

async function loadObjectiveOptions(courseId: string): Promise<MasteryGateObjectiveOption[]> {
  const objectives = await prisma.learningObjective.findMany({
    where: { courseId },
    select: {
      id: true,
      title: true,
      description: true,
      weekId: true,
      week: {
        select: {
          title: true,
          weekNumber: true,
        },
      },
    },
    orderBy: [{ moduleNumber: 'asc' }, { orderIndex: 'asc' }],
  })

  return objectives.map((objective) => ({
    id: objective.id,
    title: objective.title,
    description: objective.description ?? null,
    weekId: objective.weekId ?? null,
    weekLabel: objective.week ? `Week ${objective.week.weekNumber}: ${objective.week.title}` : null,
  }))
}

async function loadLinkedAssignments(courseId: string): Promise<LinkedAssignmentRow[]> {
  const assignments = await prisma.assignment.findMany({
    where: {
      courseId,
    },
    select: {
      id: true,
      title: true,
      weekId: true,
      assessmentMode: true,
      assessmentConfig: true,
      isPublished: true,
      type: true,
      rubricId: true,
      pointsPossible: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return assignments
    .filter((assignment) =>
      assignmentSupportsAssessmentMode(
        {
          assessmentMode: assignment.assessmentMode,
          assessmentConfig: assignment.assessmentConfig,
        },
        'MASTERY_GATE'
      )
    )
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      weekId: assignment.weekId ?? null,
      assessmentMode: assignment.assessmentMode,
      assessmentConfig: assignment.assessmentConfig,
      isPublished: assignment.isPublished,
      type: assignment.type,
      rubricId: assignment.rubricId,
      pointsPossible: assignment.pointsPossible,
    }))
}

async function loadGateRows(
  courseId: string,
  viewerId: string,
  includeDrafts: boolean
): Promise<GateRow[]> {
  const gates = await prisma.masteryGate.findMany({
    where: {
      courseId,
      ...(includeDrafts ? {} : { isPublished: true }),
    },
    include: {
      week: {
        select: {
          id: true,
          title: true,
          weekNumber: true,
        },
      },
      attempts: {
        where: { userId: viewerId },
        select: {
          id: true,
          gateId: true,
          status: true,
          attemptNumber: true,
          totalQuestions: true,
          correctCount: true,
          overallScore: true,
          startedAt: true,
          completedAt: true,
          questionsAsked: true,
          gapDiagnosis: true,
          masteryByConceptJson: true,
        },
        orderBy: { attemptNumber: 'desc' },
      },
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  })

  return gates.map((gate) => ({
    id: gate.id,
    courseId: gate.courseId,
    weekId: gate.weekId ?? null,
    title: gate.title,
    description: gate.description ?? null,
    concepts: gate.concepts,
    bloomFloor: gate.bloomFloor,
    passThreshold: gate.passThreshold,
    maxAttempts: gate.maxAttempts,
    cooldownHours: gate.cooldownHours,
    orderIndex: gate.orderIndex,
    unlocksWeekId: gate.unlocksWeekId ?? null,
    unlocksGateId: gate.unlocksGateId ?? null,
    isPublished: gate.isPublished,
    week: gate.week
      ? {
          id: gate.week.id,
          title: gate.week.title,
          weekNumber: gate.week.weekNumber,
        }
      : null,
    attempts: gate.attempts.map((attempt) => ({
      id: attempt.id,
      gateId: attempt.gateId,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      totalQuestions: attempt.totalQuestions,
      correctCount: attempt.correctCount,
      overallScore: attempt.overallScore,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      questionsAsked: attempt.questionsAsked,
      gapDiagnosis: attempt.gapDiagnosis,
      masteryByConceptJson: attempt.masteryByConceptJson,
    })),
  }))
}

async function buildReadinessMap(userId: string, courseId: string) {
  const [conceptMasteries, dueConcepts, conceptStates] = await Promise.all([
    getConceptMasteries(userId),
    getDueConcepts(userId, courseId),
    prisma.conceptState.findMany({
      where: { userId, courseId },
      select: {
        conceptSlug: true,
        bloomHighWater: true,
      },
    }),
  ])

  const readiness = new Map<
    string,
    {
      mastery: number | null
      effectiveMastery: number | null
      bloomHighWater: number | null
      dueNow: boolean
    }
  >()

  for (const mastery of conceptMasteries) {
    const key = normalizeConceptKey(mastery.concept)
    readiness.set(key, {
      mastery: clampUnit(mastery.masteryLevel),
      effectiveMastery: clampUnit(mastery.effectiveMastery),
      bloomHighWater: null,
      dueNow: false,
    })
  }

  for (const state of conceptStates) {
    const current = readiness.get(state.conceptSlug)
    readiness.set(state.conceptSlug, {
      mastery: current?.mastery ?? null,
      effectiveMastery: current?.effectiveMastery ?? null,
      bloomHighWater: state.bloomHighWater ?? null,
      dueNow: current?.dueNow ?? false,
    })
  }

  for (const due of dueConcepts) {
    const current = readiness.get(due.conceptSlug)
    readiness.set(due.conceptSlug, {
      mastery: current?.mastery ?? null,
      effectiveMastery: current?.effectiveMastery ?? null,
      bloomHighWater: current?.bloomHighWater ?? due.bloomHighWater ?? null,
      dueNow: true,
    })
  }

  return readiness
}

function buildConceptReadiness(
  concepts: string[],
  readinessMap: Map<
    string,
    {
      mastery: number | null
      effectiveMastery: number | null
      bloomHighWater: number | null
      dueNow: boolean
    }
  >,
  gate: Pick<GateRow, 'bloomFloor' | 'passThreshold'>
): {
  readinessScore: number
  conceptsReadiness: MasteryGateConceptReadiness[]
} {
  const conceptsReadiness = concepts.map((concept) => {
    const normalized = normalizeConceptKey(concept)
    const state = readinessMap.get(normalized)
    const effective = clampUnit(state?.effectiveMastery) ?? clampUnit(state?.mastery) ?? 0
    const note =
      state == null
        ? 'No mastery signal yet.'
        : state.dueNow
          ? 'Due for review before attempting.'
          : effective >= gate.passThreshold
            ? `Ready signal looks strong for Bloom ${gate.bloomFloor}+ work.`
            : 'One more study pass would help before attempting.'

    return {
      concept,
      mastery: clampUnit(state?.mastery),
      effectiveMastery: clampUnit(state?.effectiveMastery),
      bloomHighWater: state?.bloomHighWater ?? null,
      dueNow: state?.dueNow ?? false,
      note,
    }
  })

  const average =
    conceptsReadiness.length > 0
      ? conceptsReadiness.reduce((sum, item) => {
          const baseline = item.effectiveMastery ?? item.mastery ?? 0
          const penalty = item.dueNow ? 0.1 : 0
          return sum + Math.max(0, baseline - penalty)
        }, 0) / conceptsReadiness.length
      : 0

  return {
    readinessScore: roundUnit(average),
    conceptsReadiness,
  }
}

function resolveGateAvailability(
  gate: GateRow,
  previousPublishedGatePassed: boolean
): GateAvailability {
  const latestAttempt = gate.attempts[0] ?? null
  const activeAttempt = gate.attempts.find((attempt) => attempt.status === 'IN_PROGRESS') ?? null
  const completedAttempts = gate.attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS')
  const passedAttempt = completedAttempts.find((attempt) => attempt.status === 'PASSED') ?? null

  if (passedAttempt) {
    return {
      status: 'PASSED',
      available: false,
      availabilityReason: 'Already passed',
      nextAvailableAt: null,
      latestAttempt,
      activeAttempt,
      attemptCount: gate.attempts.length,
    }
  }

  if (activeAttempt) {
    return {
      status: 'IN_PROGRESS',
      available: true,
      availabilityReason: 'Resume your in-progress attempt',
      nextAvailableAt: null,
      latestAttempt,
      activeAttempt,
      attemptCount: gate.attempts.length,
    }
  }

  if (!gate.isPublished) {
    return {
      status: 'LOCKED',
      available: false,
      availabilityReason: 'Draft gate',
      nextAvailableAt: null,
      latestAttempt,
      activeAttempt,
      attemptCount: gate.attempts.length,
    }
  }

  if (!previousPublishedGatePassed) {
    return {
      status: 'LOCKED',
      available: false,
      availabilityReason: 'Complete the previous gate first',
      nextAvailableAt: null,
      latestAttempt,
      activeAttempt,
      attemptCount: gate.attempts.length,
    }
  }

  if (gate.maxAttempts > 0 && completedAttempts.length >= gate.maxAttempts) {
    return {
      status: 'FAILED_RETRY',
      available: false,
      availabilityReason: `Maximum ${gate.maxAttempts} attempts reached`,
      nextAvailableAt: null,
      latestAttempt,
      activeAttempt,
      attemptCount: gate.attempts.length,
    }
  }

  const lastCompletedAttempt = completedAttempts[0] ?? null
  if (lastCompletedAttempt?.completedAt) {
    const nextAvailableAt = new Date(
      lastCompletedAttempt.completedAt.getTime() + gate.cooldownHours * 60 * 60 * 1000
    )
    if (nextAvailableAt > new Date()) {
      return {
        status: 'FAILED_RETRY',
        available: false,
        availabilityReason: 'Cooldown active',
        nextAvailableAt,
        latestAttempt,
        activeAttempt,
        attemptCount: gate.attempts.length,
      }
    }
  }

  return {
    status: 'AVAILABLE',
    available: true,
    availabilityReason: null,
    nextAvailableAt: null,
    latestAttempt,
    activeAttempt,
    attemptCount: gate.attempts.length,
  }
}

async function buildGateCards(input: {
  viewer: Viewer
  course: CourseAccess
  gates: GateRow[]
  linkedAssignments: LinkedAssignmentRow[]
  readinessMap: Map<
    string,
    {
      mastery: number | null
      effectiveMastery: number | null
      bloomHighWater: number | null
      dueNow: boolean
    }
  >
}): Promise<MasteryGateCard[]> {
  const gateTitleMap = new Map(input.gates.map((gate) => [gate.id, gate.title]))
  let previousPublishedGatePassed = true

  return input.gates.map((gate) => {
    const availability = resolveGateAvailability(gate, previousPublishedGatePassed)
    const readiness = buildConceptReadiness(gate.concepts, input.readinessMap, gate)
    const linkedAssignment = findLinkedAssignment(gate, input.linkedAssignments)

    const unlockLabel = gate.unlocksGateId
      ? gateTitleMap.get(gate.unlocksGateId) ?? null
      : gate.unlocksWeekId
        ? (input.course.weeks.find((week) => week.id === gate.unlocksWeekId)
            ? `Unlocks ${
                input.course.weeks.find((week) => week.id === gate.unlocksWeekId)?.title
              }`
            : null)
        : null

    if (gate.isPublished) {
      previousPublishedGatePassed = availability.status === 'PASSED'
    }

    return {
      id: gate.id,
      title: gate.title,
      description: gate.description,
      weekId: gate.weekId,
      weekTitle: formatWeekLabel(gate.week),
      orderIndex: gate.orderIndex,
      concepts: gate.concepts,
      bloomFloor: gate.bloomFloor,
      passThreshold: gate.passThreshold,
      maxAttempts: gate.maxAttempts,
      cooldownHours: gate.cooldownHours,
      isPublished: gate.isPublished,
      status: availability.status,
      available: availability.available,
      availabilityReason: availability.availabilityReason,
      nextAvailableAt: availability.nextAvailableAt?.toISOString() ?? null,
      readinessScore: readiness.readinessScore,
      conceptsReadiness: readiness.conceptsReadiness,
      latestAttempt: availability.latestAttempt ? serializeAttemptSummary(availability.latestAttempt) : null,
      attemptCount: availability.attemptCount,
      linkedAssignmentId: linkedAssignment?.id ?? null,
      linkedAssignmentTitle: linkedAssignment?.title ?? null,
      unlockLabel,
    }
  })
}

async function getGateAndCourse(viewer: Viewer, gateId: string) {
  const gate = await prisma.masteryGate.findUnique({
    where: { id: gateId },
    select: {
      id: true,
      courseId: true,
    },
  })

  if (!gate) {
    throw createHttpError('Gate not found', 404)
  }

  const course = await requireCourseAccess(viewer, gate.courseId)
  return {
    gateId: gate.id,
    course,
  }
}

export async function getCourseMasteryGateProgression(
  viewer: Viewer,
  courseId: string
): Promise<MasteryGateProgressPayload> {
  const course = await requireCourseAccess(viewer, courseId)
  const canDesign = canDesignCourse(viewer, course)
  const canAttempt = canAttemptCourse(viewer, course)

  const [gates, objectives, linkedAssignments, readinessMap] = await Promise.all([
    loadGateRows(courseId, viewer.id, canDesign),
    loadObjectiveOptions(courseId),
    loadLinkedAssignments(courseId),
    canAttempt ? buildReadinessMap(viewer.id, courseId) : Promise.resolve(new Map()),
  ])

  const gateCards = await buildGateCards({
    viewer,
    course,
    gates,
    linkedAssignments,
    readinessMap,
  })

  return {
    generatedAt: new Date().toISOString(),
    viewerRole: viewer.role,
    course: {
      id: course.id,
      courseCode: course.courseCode,
      title: course.title,
    },
    permissions: {
      canDesign,
      canAttempt,
    },
    weeks: course.weeks.map((week) => ({
      id: week.id,
      title: week.title,
      weekNumber: week.weekNumber,
    })),
    objectives,
    gates: gateCards,
  }
}

export async function getMasteryGateDetail(
  viewer: Viewer,
  gateId: string
): Promise<MasteryGateDetailPayload> {
  const { course } = await getGateAndCourse(viewer, gateId)
  const payload = await getCourseMasteryGateProgression(viewer, course.id)
  const gate = payload.gates.find((item) => item.id === gateId)
  if (!gate) {
    throw createHttpError('Gate not found', 404)
  }

  const attempts = await prisma.masteryGateAttempt.findMany({
    where: {
      gateId,
      userId: viewer.id,
    },
    select: {
      id: true,
      gateId: true,
      status: true,
      attemptNumber: true,
      totalQuestions: true,
      correctCount: true,
      overallScore: true,
      startedAt: true,
      completedAt: true,
      questionsAsked: true,
      gapDiagnosis: true,
      masteryByConceptJson: true,
    },
    orderBy: { attemptNumber: 'desc' },
  })

  const serialized: GateAttemptRow[] = attempts.map((attempt) => ({
    id: attempt.id,
    gateId: attempt.gateId,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount,
    overallScore: attempt.overallScore,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    questionsAsked: attempt.questionsAsked,
    gapDiagnosis: attempt.gapDiagnosis,
    masteryByConceptJson: attempt.masteryByConceptJson,
  }))

  const activeAttempt =
    serialized.find((attempt) => attempt.status === 'IN_PROGRESS') ?? null

  return {
    generatedAt: new Date().toISOString(),
    viewerRole: viewer.role,
    gate,
    attempts: serialized.map(serializeAttemptSummary),
    activeAttempt: activeAttempt ? serializeAttemptDetail(activeAttempt) : null,
    permissions: {
      canDesign: payload.permissions.canDesign,
      canAttempt: payload.permissions.canAttempt,
      canReview: payload.permissions.canDesign,
    },
  }
}

export async function listMasteryGateAttempts(
  viewer: Viewer,
  gateId: string
): Promise<MasteryGateAttemptSummary[]> {
  await getGateAndCourse(viewer, gateId)

  const attempts = await prisma.masteryGateAttempt.findMany({
    where: {
      gateId,
      userId: viewer.id,
    },
    select: {
      id: true,
      gateId: true,
      status: true,
      attemptNumber: true,
      totalQuestions: true,
      correctCount: true,
      overallScore: true,
      startedAt: true,
      completedAt: true,
      questionsAsked: true,
      gapDiagnosis: true,
      masteryByConceptJson: true,
    },
    orderBy: { attemptNumber: 'desc' },
  })

  return attempts.map((attempt) =>
    serializeAttemptSummary({
      id: attempt.id,
      gateId: attempt.gateId,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      totalQuestions: attempt.totalQuestions,
      correctCount: attempt.correctCount,
      overallScore: attempt.overallScore,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      questionsAsked: attempt.questionsAsked,
      gapDiagnosis: attempt.gapDiagnosis,
      masteryByConceptJson: attempt.masteryByConceptJson,
    })
  )
}

async function buildFallbackQuestion(
  courseId: string,
  concept: string,
  bloomLevel: number
): Promise<MasteryGateQuestionRecord> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true, courseCode: true },
  })

  const objective = await prisma.learningObjective.findFirst({
    where: { courseId },
    select: { title: true, description: true },
    orderBy: { orderIndex: 'asc' },
  })

  const courseLabel = course ? `${course.courseCode} - ${course.title}` : 'this course'
  const objectiveHint = objective?.description?.trim() || `Explain ${concept} in the context of ${courseLabel}.`
  const label = getBloomLabel(bloomLevel)

  let question = ''
  switch (Math.max(1, Math.min(6, bloomLevel))) {
    case 1:
      question = `At the ${label} level, define ${concept} and identify two details that make it important in ${courseLabel}.`
      break
    case 2:
      question = `At the ${label} level, explain ${concept} in your own words and show why it matters in ${courseLabel}.`
      break
    case 3:
      question = `At the ${label} level, apply ${concept} to a realistic situation from ${courseLabel}. What would you do and why?`
      break
    case 4:
      question = `At the ${label} level, analyze a situation involving ${concept}. What patterns, causes, or tradeoffs would you pay attention to?`
      break
    case 5:
      question = `At the ${label} level, evaluate a decision involving ${concept}. What judgment would you make, and what evidence supports it?`
      break
    default:
      question = `At the ${label} level, design an approach that uses ${concept} to solve a meaningful problem from ${courseLabel}.`
      break
  }

  return {
    concept,
    bloomLevel,
    question,
    expectedAnswer: objectiveHint,
  }
}

async function generateAdaptiveQuestion(
  courseId: string,
  concept: string,
  bloomLevel: number
): Promise<MasteryGateQuestionRecord> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackQuestion(courseId, concept, bloomLevel)
  }

  const [course, objective] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, courseCode: true },
    }),
    prisma.learningObjective.findFirst({
      where: { courseId },
      select: { title: true, description: true },
      orderBy: { orderIndex: 'asc' },
    }),
  ])

  try {
    const response = await withRetry(() =>
      anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Generate one mastery-gate assessment question.

Course: ${course ? `${course.courseCode} - ${course.title}` : 'Unknown course'}
Concept: ${concept}
Bloom level target: ${getBloomLabel(bloomLevel)} (${bloomLevel}/6)
Relevant objective: ${objective?.title ?? concept}
Objective detail: ${objective?.description ?? `Demonstrate understanding of ${concept}.`}

Requirements:
- The question must match the Bloom level honestly.
- Keep the prompt concise.
- Return JSON only.

JSON shape:
{"question":"...","expected_answer":"2-4 key points the student should hit"}`,
          },
        ],
      })
    )

    const text = extractTextContent(response.content)
    const json = extractJsonObject(text)
    if (!json) {
      throw new Error('No JSON object returned for adaptive question')
    }

    const parsed = JSON.parse(json) as {
      question?: unknown
      expected_answer?: unknown
    }

    if (
      typeof parsed.question !== 'string' ||
      typeof parsed.expected_answer !== 'string' ||
      !parsed.question.trim() ||
      !parsed.expected_answer.trim()
    ) {
      throw new Error('Adaptive question payload was incomplete')
    }

    return {
      concept,
      bloomLevel,
      question: parsed.question.trim(),
      expectedAnswer: parsed.expected_answer.trim(),
    }
  } catch (error) {
    console.error('[mastery-gate] Falling back to templated question generation', error)
    return buildFallbackQuestion(courseId, concept, bloomLevel)
  }
}

async function fallbackGradeAnswer(input: {
  question: MasteryGateQuestionRecord
  answer: string
}): Promise<{
  correct: boolean
  feedback: string
  gapType: GapType | 'none'
}> {
  const answerTokens = tokenize(input.answer)
  const expectedTokens = tokenize(input.question.expectedAnswer)
  const conceptTokens = tokenize(input.question.concept)
  const matches = answerTokens.filter(
    (token) => expectedTokens.includes(token) || conceptTokens.includes(token)
  )
  const overlap =
    expectedTokens.length > 0 ? matches.length / Math.max(1, Math.min(expectedTokens.length, 6)) : 0
  const hasReasoningSignal = /\b(because|therefore|so|if|then|for example|compared|tradeoff|which means)\b/i.test(
    input.answer
  )
  const wordCount = input.answer.trim().split(/\s+/).filter(Boolean).length
  const correct =
    wordCount >= 10 &&
    (overlap >= 0.25 || (input.question.bloomLevel <= 2 && matches.length >= 1) || hasReasoningSignal)

  let gapType: GapType | 'none' = 'none'
  if (!correct) {
    if (wordCount < 6) {
      gapType = 'knowledge_gap'
    } else if (input.question.bloomLevel >= 4 && !hasReasoningSignal) {
      gapType = 'transfer_failure'
    } else if (/\bnot\b|\bnever\b|\bonly\b/i.test(input.answer) && matches.length > 0) {
      gapType = 'misconception'
    } else if (input.question.bloomLevel <= 2) {
      gapType = 'recall_decay'
    } else {
      gapType = 'procedural'
    }
  }

  return {
    correct,
    feedback: correct
      ? `You demonstrated ${getBloomLabel(input.question.bloomLevel).toLowerCase()}-level understanding of ${input.question.concept}.`
      : `You touched the topic, but your answer did not yet hit enough of the expected reasoning for ${input.question.concept}. Focus on: ${input.question.expectedAnswer}`,
    gapType,
  }
}

async function gradeAdaptiveAnswer(input: {
  question: MasteryGateQuestionRecord
  answer: string
}): Promise<{
  correct: boolean
  feedback: string
  gapType: GapType | 'none'
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackGradeAnswer(input)
  }

  try {
    const response = await withRetry(() =>
      anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Grade this mastery-gate answer.

Question: ${input.question.question}
Concept: ${input.question.concept}
Bloom level: ${getBloomLabel(input.question.bloomLevel)} (${input.question.bloomLevel}/6)
Expected answer: ${input.question.expectedAnswer}
Student answer: ${input.answer}

Decide if the student met the Bloom level target.
Return JSON only.

{"correct":true,"feedback":"1-2 sentence specific feedback","gap_type":"misconception|knowledge_gap|transfer_failure|procedural|recall_decay|none"}`,
          },
        ],
      })
    )

    const text = extractTextContent(response.content)
    const json = extractJsonObject(text)
    if (!json) {
      throw new Error('No JSON object returned for answer grading')
    }

    const parsed = JSON.parse(json) as {
      correct?: unknown
      feedback?: unknown
      gap_type?: unknown
    }

    const correct = Boolean(parsed.correct)
    const feedback =
      typeof parsed.feedback === 'string' && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim()
        : correct
          ? 'Strong response.'
          : `Not quite there yet. Revisit: ${input.question.expectedAnswer}`
    const gapType =
      typeof parsed.gap_type === 'string' &&
      ['misconception', 'knowledge_gap', 'transfer_failure', 'procedural', 'recall_decay', 'none'].includes(
        parsed.gap_type
      )
        ? (parsed.gap_type as GapType | 'none')
        : correct
          ? 'none'
          : 'knowledge_gap'

    return {
      correct,
      feedback,
      gapType,
    }
  } catch (error) {
    console.error('[mastery-gate] Falling back to heuristic answer grading', error)
    return fallbackGradeAnswer(input)
  }
}

function buildGapDiagnosis(
  gate: Pick<GateRow, 'concepts' | 'passThreshold' | 'courseId'>,
  progress: AttemptConceptProgress
): MasteryGapDiagnosis[] {
  const items: MasteryGapDiagnosis[] = []

  for (const concept of gate.concepts) {
    const key = normalizeConceptKey(concept)
    const record = progress[key]
    const conceptScore = record && record.attempts > 0 ? record.score / record.attempts : 0
    if (conceptScore >= gate.passThreshold) continue

    const gapType =
      record?.gaps.length
        ? (record.gaps
            .sort(
              (a, b) =>
                record.gaps.filter((item) => item === b).length -
                record.gaps.filter((item) => item === a).length
            )[0] as GapType)
        : 'knowledge_gap'

    items.push({
      concept,
      gapType,
      explanation: `You answered ${record?.score ?? 0} of ${record?.attempts ?? 0} checks correctly for ${concept}.`,
      recommendation: buildRecommendation(gapType, concept),
      practiceMode: modeForGapType(gapType),
      practiceHref: buildPracticeHref(gate.courseId, gapType, concept),
    })
  }

  return items
}

async function refreshStudentSrDueCount(userId: string, courseId: string) {
  const dueCount = await prisma.conceptState.count({
    where: {
      userId,
      courseId,
      nextReviewAt: { lte: new Date() },
    },
  })

  await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId, srDueCount: dueCount, topConceptsThisWeek: [] },
    update: { srDueCount: dueCount },
  })
}

async function writeMasterySignals(input: {
  gate: Pick<GateRow, 'courseId' | 'concepts' | 'bloomFloor'>
  userId: string
  progress: AttemptConceptProgress
}) {
  for (const concept of input.gate.concepts) {
    const conceptSlug = normalizeConceptKey(concept)
    const record = input.progress[conceptSlug]
    const conceptScore = record && record.attempts > 0 ? record.score / record.attempts : 0

    await upsertConceptMastery(input.userId, conceptSlug, input.gate.courseId, conceptScore)

    const existing = await prisma.conceptState.findUnique({
      where: {
        userId_courseId_conceptSlug: {
          userId: input.userId,
          courseId: input.gate.courseId,
          conceptSlug,
        },
      },
      select: {
        stabilityFactor: true,
        missedReviews: true,
        bloomHighWater: true,
      },
    })

    const updated = computeNextReview(
      existing ?? {
        stabilityFactor: 1,
        missedReviews: 0,
        bloomHighWater: null,
      },
      conceptScore,
      record?.highestBloom || input.gate.bloomFloor
    )

    await prisma.conceptState.upsert({
      where: {
        userId_courseId_conceptSlug: {
          userId: input.userId,
          courseId: input.gate.courseId,
          conceptSlug,
        },
      },
      create: {
        userId: input.userId,
        courseId: input.gate.courseId,
        conceptSlug,
        stabilityFactor: updated.stabilityFactor,
        nextReviewAt: updated.nextReviewAt,
        missedReviews: updated.missedReviews,
        bloomHighWater: updated.bloomHighWater ?? null,
        firedMisconceptions: [],
      },
      update: {
        stabilityFactor: updated.stabilityFactor,
        nextReviewAt: updated.nextReviewAt,
        missedReviews: updated.missedReviews,
        bloomHighWater: updated.bloomHighWater ?? undefined,
      },
    })
  }

  await refreshStudentSrDueCount(input.userId, input.gate.courseId)
}

async function ensureMasterySubmissionAndEntry(input: {
  assignment: LinkedAssignmentRow
  studentId: string
  summaryText: string
}) {
  type SubmissionWithEntry = {
    id: string
    fileUrl: string | null
    textContent: string | null
    gradebookEntry: { id: string; status: string } | null
  }

  let submission: SubmissionWithEntry | null = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId: input.assignment.id,
        studentId: input.studentId,
      },
    },
    include: {
      gradebookEntry: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  }) as SubmissionWithEntry | null

  if (!submission) {
    submission = await prisma.submission.create({
      data: {
        assignmentId: input.assignment.id,
        studentId: input.studentId,
        type: input.assignment.type,
        textContent: input.summaryText,
      },
      include: {
        gradebookEntry: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    }) as unknown as SubmissionWithEntry
  } else if (
    !submission.fileUrl &&
    (!submission.textContent || submission.textContent.startsWith('[Mastery gate]'))
  ) {
    submission = await prisma.submission.update({
      where: { id: submission.id },
      data: { textContent: input.summaryText },
      include: {
        gradebookEntry: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    }) as unknown as SubmissionWithEntry
  }

  let gradebookEntry = submission!.gradebookEntry
  if (!gradebookEntry) {
    gradebookEntry = await prisma.gradebookEntry.create({
      data: {
        submissionId: submission!.id,
        status: 'AI_DRAFT',
      },
      select: {
        id: true,
        status: true,
      },
    })
  }

  return { submission: submission!, gradebookEntry }
}

async function syncMasteryGateGradebook(input: {
  gate: GateRow
  attempt: MasteryGateAttemptDetail
  studentId: string
  linkedAssignment: LinkedAssignmentRow | null
}) {
  if (!input.linkedAssignment) return

  const summaryText = gateSummaryText({
    gate: input.gate,
    attempt: input.attempt,
  })

  const { submission, gradebookEntry } = await ensureMasterySubmissionAndEntry({
    assignment: input.linkedAssignment,
    studentId: input.studentId,
    summaryText,
  })

  const linked = await createEvidence({
    gradebookEntryId: gradebookEntry.id,
    evidenceType: 'CONCEPT_MASTERY',
    sourceId: input.attempt.id,
    sourceLabel: `Mastery gate: ${input.gate.title}`,
  })

  await updateEvidenceScoring(linked.evidence.id, {
    aiProcessScore: input.attempt.overallScore ?? 0,
    aiCoherenceScore: input.attempt.overallScore ?? 0,
    aiDepthScore:
      input.attempt.questions.length > 0
        ? roundUnit(
            input.attempt.questions.reduce((sum, question) => sum + question.bloomLevel / 6, 0) /
              input.attempt.questions.length
          )
        : null,
    aiScoringRationale:
      input.attempt.status === 'PASSED'
        ? `Student passed ${input.gate.title} with ${input.attempt.correctCount}/${Math.max(1, input.attempt.totalQuestions)} correct.`
        : `Student completed ${input.gate.title} but did not yet meet the mastery threshold.`,
  })

  if (
    input.linkedAssignment.rubricId &&
    !FINALIZED_GRADEBOOK_STATUSES.has(gradebookEntry.status)
  ) {
    await scoreSubmission(submission!.id)
    return
  }

  if (FINALIZED_GRADEBOOK_STATUSES.has(gradebookEntry.status)) {
    return
  }

  const summary = await refreshGradebookEvidenceSummary(gradebookEntry.id)
  const normalizedScore =
    input.attempt.overallScore ?? summary.processScore ?? summary.weightedScores.process ?? 0
  const aiScore = Math.round(normalizedScore * input.linkedAssignment.pointsPossible * 10) / 10

  await prisma.gradebookEntry.update({
    where: { id: gradebookEntry.id },
    data: {
      compositeMethod: summary.compositeMethod,
      processScore: summary.processScore,
      aiScore,
      aiRawFeedback:
        input.attempt.status === 'PASSED'
          ? `Mastery gate passed. ${input.attempt.correctCount} of ${Math.max(1, input.attempt.totalQuestions)} responses met the threshold.`
          : `Mastery gate completed but still below threshold. Review linked evidence and gap diagnosis.`,
      status: 'PENDING_REVIEW',
    },
  })
}

export async function saveMasteryGateDesign(
  viewer: Viewer,
  gateId: string,
  input: MasteryGateDesignInput
): Promise<MasteryGateDetailPayload> {
  const course = await requireCourseAccess(viewer, input.courseId)
  if (!canDesignCourse(viewer, course)) {
    throw createHttpError('Forbidden', 403)
  }

  const title = input.title.trim()
  const concepts = [...new Set(input.concepts.map((concept) => concept.trim()).filter(Boolean))]
  if (!title) throw createHttpError('Title is required', 400)
  if (concepts.length === 0) throw createHttpError('Select at least one concept', 400)

  const bloomFloor = Math.max(1, Math.min(6, Math.round(input.bloomFloor)))
  const passThreshold = Math.max(0.5, Math.min(1, Number(input.passThreshold)))
  const maxAttempts = Math.max(0, Math.min(20, Math.round(input.maxAttempts)))
  const cooldownHours = Math.max(0, Math.min(240, Math.round(input.cooldownHours)))

  if (input.weekId) {
    const week = await prisma.courseWeek.findFirst({
      where: {
        id: input.weekId,
        courseId: input.courseId,
      },
      select: { id: true },
    })
    if (!week) {
      throw createHttpError('Selected week does not belong to this course', 400)
    }
  }

  const orderIndex =
    typeof input.orderIndex === 'number' && Number.isFinite(input.orderIndex)
      ? Math.max(0, Math.round(input.orderIndex))
      : ((
          await prisma.masteryGate.aggregate({
            where: { courseId: input.courseId },
            _max: { orderIndex: true },
          })
        )._max.orderIndex ?? -1) + 1

  const conflicting = await prisma.masteryGate.findFirst({
    where: {
      courseId: input.courseId,
      orderIndex,
      ...(gateId === 'new' ? {} : { id: { not: gateId } }),
    },
    select: { id: true },
  })
  if (conflicting) {
    throw createHttpError('That order position is already in use for this course', 409)
  }

  const data = {
    courseId: input.courseId,
    title,
    description: input.description?.trim() || null,
    weekId: input.weekId || null,
    concepts,
    bloomFloor,
    passThreshold,
    maxAttempts,
    cooldownHours,
    orderIndex,
    unlocksWeekId: input.unlocksWeekId || null,
    unlocksGateId: input.unlocksGateId || null,
    isPublished: Boolean(input.isPublished),
  }

  let savedGateId = gateId
  if (gateId === 'new') {
    const created = await prisma.masteryGate.create({
      data,
      select: { id: true },
    })
    savedGateId = created.id
  } else {
    const existing = await prisma.masteryGate.findFirst({
      where: {
        id: gateId,
        courseId: input.courseId,
      },
      select: { id: true },
    })
    if (!existing) {
      throw createHttpError('Gate not found', 404)
    }

    await prisma.masteryGate.update({
      where: { id: gateId },
      data,
    })
  }

  return getMasteryGateDetail(viewer, savedGateId)
}

export async function startMasteryGateAttempt(
  viewer: Viewer,
  gateId: string
): Promise<MasteryGateStartPayload> {
  const { course } = await getGateAndCourse(viewer, gateId)
  if (!canAttemptCourse(viewer, course)) {
    throw createHttpError('Forbidden', 403)
  }

  const gates = await loadGateRows(course.id, viewer.id, true)
  const gate = gates.find((item) => item.id === gateId)
  if (!gate) throw createHttpError('Gate not found', 404)

  let previousPublishedGatePassed = true
  let availability: GateAvailability | null = null
  for (const candidate of gates) {
    const candidateAvailability = resolveGateAvailability(candidate, previousPublishedGatePassed)
    if (candidate.id === gate.id) {
      availability = candidateAvailability
      break
    }
    if (candidate.isPublished) {
      previousPublishedGatePassed = candidateAvailability.status === 'PASSED'
    }
  }

  if (!availability) {
    throw createHttpError('Could not evaluate gate availability', 500)
  }

  if (availability.activeAttempt) {
    const detail = serializeAttemptDetail(availability.activeAttempt)
    const currentQuestion = detail.questions.find((question) => question.isCorrect === undefined)
    if (!currentQuestion) {
      throw createHttpError('In-progress attempt is missing its next question', 500)
    }

    return {
      attempt: detail,
      currentQuestion,
    }
  }

  if (!availability.available) {
    throw createHttpError(availability.availabilityReason ?? 'Gate is not available', 409)
  }

  const attemptNumber = await prisma.masteryGateAttempt.count({
    where: {
      gateId,
      userId: viewer.id,
    },
  })

  const firstQuestion = await generateAdaptiveQuestion(course.id, gate.concepts[0], gate.bloomFloor)

  const created = await prisma.masteryGateAttempt.create({
    data: {
      gateId,
      userId: viewer.id,
      attemptNumber: attemptNumber + 1,
      status: 'IN_PROGRESS',
      questionsAsked: toJsonValue([firstQuestion]),
      masteryByConceptJson: toJsonValue({}),
      totalQuestions: 1,
      correctCount: 0,
    },
    select: {
      id: true,
      gateId: true,
      status: true,
      attemptNumber: true,
      totalQuestions: true,
      correctCount: true,
      overallScore: true,
      startedAt: true,
      completedAt: true,
      questionsAsked: true,
      gapDiagnosis: true,
      masteryByConceptJson: true,
    },
  })

  return {
    attempt: serializeAttemptDetail({
      id: created.id,
      gateId: created.gateId,
      status: created.status,
      attemptNumber: created.attemptNumber,
      totalQuestions: created.totalQuestions,
      correctCount: created.correctCount,
      overallScore: created.overallScore,
      startedAt: created.startedAt,
      completedAt: created.completedAt,
      questionsAsked: created.questionsAsked,
      gapDiagnosis: created.gapDiagnosis,
      masteryByConceptJson: created.masteryByConceptJson,
    }),
    currentQuestion: firstQuestion,
  }
}

export async function answerMasteryGateQuestion(
  viewer: Viewer,
  gateId: string,
  attemptId: string,
  answer: string
): Promise<MasteryGateAnswerPayload> {
  const { course } = await getGateAndCourse(viewer, gateId)
  if (!canAttemptCourse(viewer, course)) {
    throw createHttpError('Forbidden', 403)
  }

  const gate = await prisma.masteryGate.findUnique({
    where: { id: gateId },
    include: {
      week: {
        select: {
          id: true,
          title: true,
          weekNumber: true,
        },
      },
    },
  })
  if (!gate) throw createHttpError('Gate not found', 404)

  const attempt = await prisma.masteryGateAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      gateId: true,
      userId: true,
      status: true,
      attemptNumber: true,
      totalQuestions: true,
      correctCount: true,
      overallScore: true,
      startedAt: true,
      completedAt: true,
      questionsAsked: true,
      gapDiagnosis: true,
      masteryByConceptJson: true,
    },
  })
  if (!attempt || attempt.gateId !== gateId || attempt.userId !== viewer.id) {
    throw createHttpError('Attempt not found', 404)
  }
  if (attempt.status !== 'IN_PROGRESS') {
    throw createHttpError('This attempt is no longer active', 409)
  }

  const questions = parseQuestions(attempt.questionsAsked)
  const currentQuestion = [...questions].reverse().find((question) => question.isCorrect === undefined)
  if (!currentQuestion) {
    throw createHttpError('No active question found for this attempt', 409)
  }

  const grading = await gradeAdaptiveAnswer({
    question: currentQuestion,
    answer,
  })

  const questionIndex = questions.findIndex(
    (question) =>
      question.question === currentQuestion.question &&
      question.concept === currentQuestion.concept &&
      question.isCorrect === undefined
  )
  if (questionIndex < 0) {
    throw createHttpError('Could not locate the active question to update', 500)
  }

  questions[questionIndex] = {
    ...questions[questionIndex],
    studentAnswer: answer.trim(),
    isCorrect: grading.correct,
    feedback: grading.feedback,
    gapType: grading.gapType,
    answeredAt: new Date().toISOString(),
  }

  const progress = parseMasteryByConcept(attempt.masteryByConceptJson)
  const conceptKey = normalizeConceptKey(currentQuestion.concept)
  if (!progress[conceptKey]) {
    progress[conceptKey] = {
      score: 0,
      attempts: 0,
      gaps: [],
      highestBloom: 0,
    }
  }
  progress[conceptKey].attempts += 1
  if (grading.correct) {
    progress[conceptKey].score += 1
  }
  if (grading.gapType !== 'none') {
    progress[conceptKey].gaps.push(grading.gapType)
  }
  progress[conceptKey].highestBloom = Math.max(
    progress[conceptKey].highestBloom,
    grading.correct ? currentQuestion.bloomLevel : Math.max(1, currentQuestion.bloomLevel - 1)
  )

  const conceptAttempts = progress[conceptKey].attempts
  const answeredQuestions = questions.filter((question) => question.isCorrect !== undefined)
  const correctCount = answeredQuestions.filter((question) => question.isCorrect).length

  let nextQuestion: MasteryGateQuestionRecord | null = null
  if (conceptAttempts < QUESTIONS_PER_CONCEPT) {
    const nextBloom = grading.correct
      ? Math.min(6, currentQuestion.bloomLevel + 1)
      : Math.max(1, currentQuestion.bloomLevel - 1)
    nextQuestion = await generateAdaptiveQuestion(course.id, currentQuestion.concept, nextBloom)
  } else {
    for (const concept of gate.concepts) {
      const key = normalizeConceptKey(concept)
      if ((progress[key]?.attempts ?? 0) < QUESTIONS_PER_CONCEPT) {
        nextQuestion = await generateAdaptiveQuestion(course.id, concept, gate.bloomFloor)
        break
      }
    }
  }

  if (nextQuestion) {
    questions.push(nextQuestion)
  }

  const totalQuestions = questions.length

  if (nextQuestion) {
    const updated = await prisma.masteryGateAttempt.update({
      where: { id: attemptId },
      data: {
        questionsAsked: toJsonValue(questions),
        masteryByConceptJson: toJsonValue(progress),
        totalQuestions,
        correctCount,
      },
      select: {
        id: true,
        gateId: true,
        status: true,
        attemptNumber: true,
        totalQuestions: true,
        correctCount: true,
        overallScore: true,
        startedAt: true,
        completedAt: true,
        questionsAsked: true,
        gapDiagnosis: true,
        masteryByConceptJson: true,
      },
    })

    return {
      attempt: serializeAttemptDetail({
        id: updated.id,
        gateId: updated.gateId,
        status: updated.status,
        attemptNumber: updated.attemptNumber,
        totalQuestions: updated.totalQuestions,
        correctCount: updated.correctCount,
        overallScore: updated.overallScore,
        startedAt: updated.startedAt,
        completedAt: updated.completedAt,
        questionsAsked: updated.questionsAsked,
        gapDiagnosis: updated.gapDiagnosis,
        masteryByConceptJson: updated.masteryByConceptJson,
      }),
      currentQuestion: nextQuestion,
      correct: grading.correct,
      feedback: grading.feedback,
      completed: false,
      passed: false,
      gapDiagnosis: [],
    }
  }

  const overallScore = answeredQuestions.length > 0 ? correctCount / answeredQuestions.length : 0
  const passed = overallScore >= gate.passThreshold
  const gapDiagnosis = buildGapDiagnosis(
    {
      concepts: gate.concepts,
      passThreshold: gate.passThreshold,
      courseId: gate.courseId,
    },
    progress
  )

  const completed = await prisma.masteryGateAttempt.update({
    where: { id: attemptId },
    data: {
      questionsAsked: toJsonValue(questions),
      masteryByConceptJson: toJsonValue(progress),
      totalQuestions,
      correctCount,
      overallScore,
      gapDiagnosis: toJsonValue(gapDiagnosis),
      status: passed ? 'PASSED' : 'FAILED_RETRY',
      completedAt: new Date(),
    },
    select: {
      id: true,
      gateId: true,
      status: true,
      attemptNumber: true,
      totalQuestions: true,
      correctCount: true,
      overallScore: true,
      startedAt: true,
      completedAt: true,
      questionsAsked: true,
      gapDiagnosis: true,
      masteryByConceptJson: true,
    },
  })

  const completedAttempt: GateAttemptRow = {
    id: completed.id,
    gateId: completed.gateId,
    status: completed.status,
    attemptNumber: completed.attemptNumber,
    totalQuestions: completed.totalQuestions,
    correctCount: completed.correctCount,
    overallScore: completed.overallScore,
    startedAt: completed.startedAt,
    completedAt: completed.completedAt,
    questionsAsked: completed.questionsAsked,
    gapDiagnosis: completed.gapDiagnosis,
    masteryByConceptJson: completed.masteryByConceptJson,
  }

  const attemptDetail = serializeAttemptDetail(completedAttempt)
  const linkedAssignments = await loadLinkedAssignments(gate.courseId)
  const linkedAssignment = findLinkedAssignment(
    {
      id: gate.id,
      weekId: gate.weekId ?? null,
    },
    linkedAssignments
  )

  await writeMasterySignals({
    gate: {
      courseId: gate.courseId,
      concepts: gate.concepts,
      bloomFloor: gate.bloomFloor,
    },
    userId: viewer.id,
    progress,
  })

  await syncMasteryGateGradebook({
    gate: {
      id: gate.id,
      courseId: gate.courseId,
      weekId: gate.weekId ?? null,
      title: gate.title,
      description: gate.description ?? null,
      concepts: gate.concepts,
      bloomFloor: gate.bloomFloor,
      passThreshold: gate.passThreshold,
      maxAttempts: gate.maxAttempts,
      cooldownHours: gate.cooldownHours,
      orderIndex: gate.orderIndex,
      unlocksWeekId: gate.unlocksWeekId ?? null,
      unlocksGateId: gate.unlocksGateId ?? null,
      isPublished: gate.isPublished,
      week: gate.week
        ? {
            id: gate.week.id,
            title: gate.week.title,
            weekNumber: gate.week.weekNumber,
          }
        : null,
      attempts: [],
    },
    attempt: attemptDetail,
    studentId: viewer.id,
    linkedAssignment,
  })

  return {
    attempt: attemptDetail,
    currentQuestion: null,
    correct: grading.correct,
    feedback: grading.feedback,
    completed: true,
    passed,
    gapDiagnosis,
  }
}
