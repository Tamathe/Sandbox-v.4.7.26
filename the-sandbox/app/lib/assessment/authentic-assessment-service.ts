import type { Prisma } from '../../generated/prisma'
import { prisma } from '../prisma'
import {
  assignmentSupportsAssessmentMode,
  extractAssessmentModeConfig,
} from './assessment-canvas'
import { createEvidence, updateEvidence, updateEvidenceScoring } from './evidence-service'
import {
  clampUnit,
  type AssessmentCanvasAssignmentInput,
  type AuthenticAssessmentFacultyPayload,
  type AuthenticAssessmentFacultyRow,
  type AuthenticAssessmentMetrics,
  type AuthenticAssessmentStudentPayload,
  type AuthenticAssessmentSubmissionPayload,
  type AuthenticCanvasModeConfig,
  type AuthenticToolOption,
} from './types'

type Viewer = {
  id: string
  role: string
}

type AuthenticConfig = AuthenticCanvasModeConfig

const FINALIZED_GRADEBOOK_STATUSES = new Set(['APPROVED', 'RELEASED'])
const QUALITY_SIGNAL_SCORES: Record<string, number> = {
  strong: 1,
  partial: 0.7,
  minimal: 0.35,
  incomplete: 0.1,
}

function createHttpError(message: string, status: number) {
  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}

function roundUnit(value: number | null | undefined): number {
  return Math.round((clampUnit(value) ?? 0) * 1000) / 1000
}

function roundNullableUnit(value: number | null | undefined): number | null {
  const normalized = clampUnit(value)
  return normalized == null ? null : Math.round(normalized * 1000) / 1000
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function weightedAverage(values: Array<{ score: number | null | undefined; weight: number }>): number {
  const valid = values
    .map((item) => ({
      score: clampUnit(item.score),
      weight: item.weight > 0 ? item.weight : 0,
    }))
    .filter((item): item is { score: number; weight: number } => item.score != null && item.weight > 0)

  if (valid.length === 0) return 0

  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) return 0

  return roundUnit(
    valid.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight
  )
}

function parseAuthenticConfig(input: AssessmentCanvasAssignmentInput): AuthenticConfig {
  return extractAssessmentModeConfig(input, 'AUTHENTIC')
}

function qualitySignalScore(value: string | null): number | null {
  if (!value) return null
  return QUALITY_SIGNAL_SCORES[value] ?? null
}

function canManageAssignment(viewer: Viewer, instructorId: string) {
  return viewer.role === 'ADMIN' || (viewer.role === 'EDUCATOR' && viewer.id === instructorId)
}

async function getAssignmentOrThrow(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      title: true,
      pointsPossible: true,
      dueAt: true,
      createdAt: true,
      assessmentMode: true,
      assessmentConfig: true,
      isPublished: true,
      course: {
        select: {
          id: true,
          title: true,
          instructorId: true,
        },
      },
    },
  })

  if (!assignment) {
    throw createHttpError('Assignment not found', 404)
  }

  if (
    !assignmentSupportsAssessmentMode(
      {
        assessmentMode: assignment.assessmentMode,
        assessmentConfig: assignment.assessmentConfig,
      },
      'AUTHENTIC'
    )
  ) {
    throw createHttpError('This assignment is not configured for authentic assessment', 400)
  }

  return assignment
}

export async function listAuthenticToolOptions(
  studentId: string,
  assignmentStartDate: Date
): Promise<AuthenticToolOption[]> {
  const tools = await prisma.tool.findMany({
    where: { creatorId: studentId },
    select: {
      id: true,
      name: true,
      shortDescription: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      sessions: {
        where: {
          startedAt: { gte: assignmentStartDate },
          sensitiveSession: false,
        },
        select: {
          userId: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  })

  return tools.map((tool) => {
    const externalSessions = tool.sessions.filter((session) => session.userId !== studentId)
    const uniqueUsers = new Set(
      externalSessions
        .map((session) => session.userId)
        .filter((userId): userId is string => Boolean(userId))
    )

    return {
      id: tool.id,
      name: tool.name,
      shortDescription: tool.shortDescription,
      published: tool.published,
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
      sessionCount: externalSessions.length,
      uniqueUsers: uniqueUsers.size,
      href: `/tools/${tool.id}`,
    }
  })
}

export async function computeAuthenticMetrics(input: {
  toolId: string
  assignmentStartDate: Date
  assessmentMode?: string | null
  assessmentConfig: Prisma.JsonValue | null
}): Promise<AuthenticAssessmentMetrics> {
  const config = parseAuthenticConfig({
    assessmentMode: input.assessmentMode,
    assessmentConfig: input.assessmentConfig,
  })
  const tool = await prisma.tool.findUnique({
    where: { id: input.toolId },
    select: {
      id: true,
      name: true,
      toolType: true,
      creatorId: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      sessions: {
        where: {
          startedAt: { gte: input.assignmentStartDate },
          sensitiveSession: false,
        },
        select: {
          id: true,
          userId: true,
          durationSeconds: true,
          score: true,
          qualitySignal: true,
        },
      },
      comments: {
        where: {
          createdAt: { gte: input.assignmentStartDate },
        },
        select: {
          id: true,
          userId: true,
          createdAt: true,
        },
      },
      ratings: {
        where: {
          createdAt: { gte: input.assignmentStartDate },
        },
        select: {
          id: true,
          userId: true,
          createdAt: true,
        },
      },
    },
  })

  if (!tool) {
    throw createHttpError('Tool not found', 404)
  }

  const sessions = tool.sessions.filter((session) => session.userId !== tool.creatorId)
  const uniqueUsers = new Set(
    sessions.map((session) => session.userId).filter((userId): userId is string => Boolean(userId))
  )
  const sessionCounts = new Map<string, number>()
  for (const session of sessions) {
    if (!session.userId) continue
    sessionCounts.set(session.userId, (sessionCounts.get(session.userId) ?? 0) + 1)
  }

  const repeatUsers = [...sessionCounts.values()].filter((count) => count > 1).length
  const durations = sessions
    .map((session) => session.durationSeconds)
    .filter((value): value is number => typeof value === 'number' && value > 0)
  const sessionScores = sessions
    .map((session) => session.score)
    .filter((value): value is number => typeof value === 'number')
  const signalScores = sessions
    .map((session) => qualitySignalScore(session.qualitySignal))
    .filter((value): value is number => value != null)
  const positiveRatings = sessions.filter(
    (session) => session.qualitySignal === 'strong' || session.qualitySignal === 'partial'
  ).length
  const comments = tool.comments.filter((comment) => comment.userId !== tool.creatorId)
  const ratings = tool.ratings.filter((rating) => rating.userId !== tool.creatorId)
  const feedbackEvents = [...comments, ...ratings]
  const feedbackResponseRate =
    feedbackEvents.length === 0
      ? 0
      : roundUnit(
          feedbackEvents.filter((event) => event.createdAt < tool.updatedAt).length /
            feedbackEvents.length
        )
  const editCount = tool.updatedAt > tool.createdAt ? 1 : 0

  const avgDuration = durations.length > 0 ? Math.round(average(durations) ?? 0) : 0
  const avgSessionScore = roundNullableUnit(average(sessionScores))
  const avgQualitySignal = roundNullableUnit(average(signalScores))

  const functionality = weightedAverage([
    { score: tool.published ? 1 : 0, weight: 0.35 },
    { score: sessions.length > 0 ? 1 : 0, weight: 0.15 },
    { score: avgSessionScore ?? avgQualitySignal, weight: 0.35 },
    {
      score: Math.min(1, avgDuration / config.durationTargetSeconds),
      weight: 0.15,
    },
  ])

  const usage = weightedAverage([
    { score: Math.min(1, uniqueUsers.size / config.uniqueUsersTarget), weight: 0.5 },
    { score: Math.min(1, sessions.length / config.totalSessionsTarget), weight: 0.35 },
    { score: Math.min(1, repeatUsers / config.repeatUsersTarget), weight: 0.15 },
  ])

  const impact = weightedAverage([
    { score: avgQualitySignal, weight: 0.7 },
    {
      score: sessions.length > 0 ? positiveRatings / Math.max(1, signalScores.length) : 0,
      weight: 0.3,
    },
  ])

  const iteration = weightedAverage([
    { score: editCount > 0 ? 1 : 0, weight: 0.55 },
    { score: feedbackResponseRate, weight: 0.45 },
  ])

  const composite = roundUnit(
    functionality * config.weights.functionality +
      usage * config.weights.usage +
      impact * config.weights.impact +
      iteration * config.weights.iteration
  )

  return {
    toolId: tool.id,
    toolName: tool.name,
    toolType: tool.toolType,
    toolHref: `/tools/${tool.id}`,
    published: tool.published,
    createdAt: tool.createdAt.toISOString(),
    publishedAt: null,
    lastEditedAt: tool.updatedAt.toISOString(),
    hasWorkingChat: sessions.length > 0,
    sessionCount: sessions.length,
    avgSessionDuration: avgDuration,
    avgSessionScore,
    uniqueUsers: uniqueUsers.size,
    totalSessions: sessions.length,
    repeatUsers,
    avgQualitySignal,
    positiveRatings,
    totalRatings: signalScores.length,
    commentCount: comments.length,
    editCount,
    feedbackResponseRate,
    iterationHeuristic:
      'Iteration is inferred from creator update activity after outside feedback because tool revision history is not yet tracked as a first-class record.',
    scores: {
      functionality,
      usage,
      impact,
      iteration,
      composite,
    },
  }
}

function buildAuthenticFeedback(metrics: AuthenticAssessmentMetrics) {
  const parts = [
    metrics.published
      ? `${metrics.toolName} is published and collecting real audience signals.`
      : `${metrics.toolName} is not published yet, which limits authentic audience evidence.`,
    `${metrics.uniqueUsers} unique users generated ${metrics.totalSessions} sessions, with ${metrics.repeatUsers} repeat users returning.`,
  ]

  if (metrics.totalRatings > 0) {
    parts.push(
      `Impact signals average ${Math.round((metrics.avgQualitySignal ?? 0) * 100)}%, with ${metrics.positiveRatings}/${metrics.totalRatings} sessions marked positive.`
    )
  } else {
    parts.push('No outside quality signals have been recorded yet, so impact remains provisional.')
  }

  parts.push(metrics.iterationHeuristic)

  return parts.join(' ')
}

export async function syncAuthenticAssessmentSubmission(
  submissionId: string
): Promise<AuthenticAssessmentSubmissionPayload | null> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      submittedAt: true,
      textContent: true,
      studentId: true,
      linkedToolId: true,
      linkedTool: {
        select: {
          id: true,
          name: true,
        },
      },
      assignment: {
        select: {
          id: true,
          title: true,
          pointsPossible: true,
          createdAt: true,
          assessmentMode: true,
          assessmentConfig: true,
        },
      },
      gradebookEntry: {
        select: {
          id: true,
          status: true,
          aiScore: true,
          facultyScore: true,
          facultyFeedback: true,
          evidence: {
            where: { evidenceType: 'TOOL_USAGE' },
            select: {
              id: true,
              sourceId: true,
              facultyScore: true,
              facultyNotes: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
    },
  })

  if (
    !submission ||
    !assignmentSupportsAssessmentMode(
      {
        assessmentMode: submission.assignment.assessmentMode,
        assessmentConfig: submission.assignment.assessmentConfig,
      },
      'AUTHENTIC'
    ) ||
    !submission.linkedToolId
  ) {
    return null
  }

  let gradebookEntry = submission.gradebookEntry
  if (!gradebookEntry) {
    gradebookEntry = await prisma.gradebookEntry.create({
      data: {
        submissionId: submission.id,
        status: 'AI_DRAFT',
      },
      select: {
        id: true,
        status: true,
        aiScore: true,
        facultyScore: true,
        facultyFeedback: true,
        evidence: {
          where: { evidenceType: 'TOOL_USAGE' },
          select: {
            id: true,
            sourceId: true,
            facultyScore: true,
            facultyNotes: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
  }

  const metrics = await computeAuthenticMetrics({
    toolId: submission.linkedToolId,
    assignmentStartDate: submission.assignment.createdAt,
    assessmentMode: submission.assignment.assessmentMode,
    assessmentConfig: submission.assignment.assessmentConfig,
  })

  let linked = await createEvidence({
    gradebookEntryId: gradebookEntry.id,
    evidenceType: 'TOOL_USAGE',
    sourceId: submission.linkedToolId,
    sourceLabel: `Authentic tool usage: ${submission.linkedTool?.name ?? metrics.toolName}`,
    studentAnnotation: submission.textContent ?? null,
  })

  if ((submission.textContent ?? null) !== linked.evidence.studentAnnotation) {
    linked = await updateEvidence(linked.evidence.id, {
      studentAnnotation: submission.textContent ?? null,
    })
  }

  await updateEvidenceScoring(linked.evidence.id, {
    aiProcessScore: metrics.scores.functionality,
    aiCoherenceScore: metrics.scores.usage,
    aiDepthScore: weightedAverage([
      { score: metrics.scores.impact, weight: 0.7 },
      { score: metrics.scores.iteration, weight: 0.3 },
    ]),
    aiScoringRationale: buildAuthenticFeedback(metrics),
  })

  if (!FINALIZED_GRADEBOOK_STATUSES.has(gradebookEntry.status)) {
    await prisma.gradebookEntry.update({
      where: { id: gradebookEntry.id },
      data: {
        compositeMethod: 'authentic_metrics',
        processScore: metrics.scores.composite,
        aiScore: Math.round(metrics.scores.composite * submission.assignment.pointsPossible * 10) / 10,
        aiRawFeedback: buildAuthenticFeedback(metrics),
        status: 'PENDING_REVIEW',
      },
    })
  }

  const refreshedEntry = await prisma.gradebookEntry.findUnique({
    where: { id: gradebookEntry.id },
    select: {
      id: true,
      status: true,
      aiScore: true,
      facultyScore: true,
      facultyFeedback: true,
      evidence: {
        where: {
          evidenceType: 'TOOL_USAGE',
          sourceId: submission.linkedToolId,
        },
        select: {
          id: true,
          facultyScore: true,
          facultyNotes: true,
        },
        take: 1,
      },
    },
  })

  if (!refreshedEntry) {
    throw createHttpError('Gradebook entry not found after authentic assessment sync', 500)
  }

  const evidence = refreshedEntry.evidence[0] ?? null

  return {
    submissionId: submission.id,
    submittedAt: submission.submittedAt.toISOString(),
    reflection: submission.textContent ?? null,
    linkedToolId: submission.linkedToolId,
    linkedToolName: submission.linkedTool?.name ?? metrics.toolName,
    gradebookEntryId: refreshedEntry.id,
    gradebookStatus: refreshedEntry.status,
    aiScore: refreshedEntry.aiScore,
    facultyScore: refreshedEntry.facultyScore,
    facultyFeedback: refreshedEntry.facultyFeedback ?? null,
    evidenceId: evidence?.id ?? null,
    evidenceFacultyScore: evidence?.facultyScore ?? null,
    evidenceFacultyNotes: evidence?.facultyNotes ?? null,
    metrics,
  }
}

export async function getAuthenticAssessmentStudentPayload(
  viewer: Viewer,
  assignmentId: string
): Promise<AuthenticAssessmentStudentPayload> {
  const assignment = await getAssignmentOrThrow(assignmentId)

  if (viewer.role !== 'STUDENT') {
    throw createHttpError('Forbidden', 403)
  }

  if (!assignment.isPublished) {
    throw createHttpError('Assignment not found', 404)
  }

  const enrolled = await prisma.courseEnrollment.findFirst({
    where: {
      courseId: assignment.course.id,
      studentId: viewer.id,
    },
    select: { id: true },
  })

  if (!enrolled) {
    throw createHttpError('Forbidden', 403)
  }

  const submission = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId: viewer.id,
      },
    },
    select: { id: true },
  })

  return {
    generatedAt: new Date().toISOString(),
    viewerRole: viewer.role,
    assignment: {
      id: assignment.id,
      title: assignment.title,
      pointsPossible: assignment.pointsPossible,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      startDate: assignment.createdAt.toISOString(),
      course: {
        id: assignment.course.id,
        title: assignment.course.title,
      },
    },
    availableTools: await listAuthenticToolOptions(viewer.id, assignment.createdAt),
    submission: submission ? await syncAuthenticAssessmentSubmission(submission.id) : null,
  }
}

export async function getAuthenticAssessmentFacultyPayload(
  viewer: Viewer,
  assignmentId: string
): Promise<AuthenticAssessmentFacultyPayload> {
  const assignment = await getAssignmentOrThrow(assignmentId)

  if (!canManageAssignment(viewer, assignment.course.instructorId)) {
    throw createHttpError('Forbidden', 403)
  }

  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId,
    },
    select: {
      id: true,
      submittedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      linkedToolId: true,
      linkedTool: {
        select: {
          id: true,
          name: true,
        },
      },
      gradebookEntry: {
        select: {
          id: true,
          status: true,
          aiScore: true,
          facultyScore: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  })

  const rows: AuthenticAssessmentFacultyRow[] = []
  for (const submission of submissions) {
    const synced = await syncAuthenticAssessmentSubmission(submission.id)
    rows.push({
      studentId: submission.student.id,
      studentName: submission.student.name,
      studentEmail: submission.student.email,
      submissionId: submission.id,
      submittedAt: submission.submittedAt.toISOString(),
      linkedToolId: submission.linkedToolId ?? '',
      linkedToolName: submission.linkedTool?.name ?? 'No linked tool',
      gradebookEntryId: submission.gradebookEntry?.id ?? synced?.gradebookEntryId ?? '',
      gradebookStatus: submission.gradebookEntry?.status ?? synced?.gradebookStatus ?? 'AI_DRAFT',
      aiScore: synced?.aiScore ?? submission.gradebookEntry?.aiScore ?? null,
      facultyScore: synced?.facultyScore ?? submission.gradebookEntry?.facultyScore ?? null,
      metrics: synced?.metrics ?? null,
    })
  }

  const composites = rows
    .map((row) => row.metrics?.scores.composite)
    .filter((value): value is number => value != null)
  const uniqueUsers = rows.map((row) => row.metrics?.uniqueUsers ?? null).filter((value): value is number => value != null)
  const impactScores = rows.map((row) => row.metrics?.scores.impact ?? null).filter((value): value is number => value != null)

  return {
    generatedAt: new Date().toISOString(),
    viewerRole: viewer.role,
    assignment: {
      id: assignment.id,
      title: assignment.title,
      pointsPossible: assignment.pointsPossible,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      startDate: assignment.createdAt.toISOString(),
      course: {
        id: assignment.course.id,
        title: assignment.course.title,
      },
    },
    summary: {
      submittedCount: rows.length,
      publishedCount: rows.filter((row) => row.metrics?.published).length,
      avgComposite: roundNullableUnit(average(composites)),
      avgUniqueUsers: average(uniqueUsers),
      avgImpact: roundNullableUnit(average(impactScores)),
    },
    submissions: rows,
  }
}

export async function recomputeAuthenticAssessmentForAssignment(
  viewer: Viewer,
  assignmentId: string
): Promise<{ recomputed: number; skipped: number }> {
  const assignment = await getAssignmentOrThrow(assignmentId)

  if (!canManageAssignment(viewer, assignment.course.instructorId)) {
    throw createHttpError('Forbidden', 403)
  }

  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId,
      linkedToolId: { not: null },
    },
    select: { id: true },
  })

  let recomputed = 0
  let skipped = 0

  for (const submission of submissions) {
    const result = await syncAuthenticAssessmentSubmission(submission.id)
    if (result) recomputed += 1
    else skipped += 1
  }

  return { recomputed, skipped }
}
