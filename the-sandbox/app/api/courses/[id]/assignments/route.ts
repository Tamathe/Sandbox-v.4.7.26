import { NextRequest, NextResponse } from 'next/server'
import type { Prisma, EvidenceType as PrismaEvidenceType } from '../../../../generated/prisma'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  ASSESSMENT_MODES,
  EVIDENCE_TYPES,
  type EvidenceType as AssessmentEvidenceType,
} from '../../../../lib/assessment/types'

export const runtime = 'nodejs'

function canManage(course: { instructorId: string }, user: { id: string; role: string }) {
  if (user.role === 'ADMIN') return true
  return user.role === 'EDUCATOR' && user.id === course.instructorId
}

// GET /api/courses/[id]/assignments
// Faculty: all assignments. Students: published only, with their own submission status.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true, isPublic: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty = canManage(course, user)

  const assignments = await prisma.assignment.findMany({
    where: {
      courseId: id,
      ...(isFaculty ? {} : { isPublished: true }),
    },
    include: {
      rubric: { select: { id: true, title: true } },
      tool: { select: { id: true, name: true } },
      _count: { select: { submissions: true } },
      ...(isFaculty
        ? {}
        : {
            submissions: {
              where: { studentId: user.id },
              select: {
                id: true,
                submittedAt: true,
                gradebookEntry: {
                  select: { status: true, facultyScore: true, facultyFeedback: true },
                },
              },
            },
          }),
    },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
  })

  if (!isFaculty) return NextResponse.json(assignments, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })

  // Educator enrichment: enrolled count + per-assignment avg AI score
  const [enrolledCount, submissionsWithGrades] = await Promise.all([
    prisma.courseEnrollment.count({ where: { courseId: id } }),
    prisma.submission.findMany({
      where: { assignment: { courseId: id } },
      select: {
        assignmentId: true,
        gradebookEntry: { select: { aiScore: true } },
      },
    }),
  ])

  // Build per-assignment map of raw AI scores
  const gradeMap: Record<string, number[]> = {}
  for (const s of submissionsWithGrades) {
    if (s.gradebookEntry?.aiScore != null) {
      ;(gradeMap[s.assignmentId] ??= []).push(s.gradebookEntry.aiScore)
    }
  }

  const enriched = assignments.map((a) => {
    const scores = gradeMap[a.id]
    const avgAiScore =
      scores?.length && a.pointsPossible > 0
        ? Math.round((scores.reduce((sum, v) => sum + v, 0) / scores.length / a.pointsPossible) * 100)
        : null
    return {
      ...a,
      submissionCount: a._count.submissions,
      enrolledCount,
      avgAiScore,
    }
  })

  return NextResponse.json(enriched, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST /api/courses/[id]/assignments
// Faculty only — creates a new assignment.
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true, isPublic: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canManage(course, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    title: string
    description?: string
    type: 'LEGACY_SUBMISSION' | 'AI_EXPERIENCE' | 'TOOL_ASSESSMENT'
    toolId?: string
    rubricId?: string
    dueAt?: string
    pointsPossible: number
    canvasAssignmentId?: string
    isPublished?: boolean
    assessmentToolIds?: string[]
    minimumAttempts?: number
    assessmentWindowEnd?: string
    assessmentMode?: string
    assessmentConfig?: Record<string, unknown> | null
    evidenceTypes?: string[]
  }
  const {
    title,
    description,
    type,
    toolId,
    rubricId,
    dueAt,
    pointsPossible,
    canvasAssignmentId,
    isPublished,
    assessmentMode,
    assessmentConfig,
  } = body

  if (!title || !type || pointsPossible == null) {
    return NextResponse.json({ error: 'title, type, and pointsPossible are required' }, { status: 400 })
  }
  if (!['LEGACY_SUBMISSION', 'AI_EXPERIENCE', 'TOOL_ASSESSMENT'].includes(type)) {
    return NextResponse.json({ error: 'Invalid assignment type' }, { status: 400 })
  }
  if (
    assessmentMode &&
    !ASSESSMENT_MODES.includes(assessmentMode as (typeof ASSESSMENT_MODES)[number])
  ) {
    return NextResponse.json({ error: 'Invalid assessmentMode' }, { status: 400 })
  }
  if (type === 'AI_EXPERIENCE' && !toolId) {
    return NextResponse.json({ error: 'toolId is required for AI_EXPERIENCE assignments' }, { status: 400 })
  }

  let evidenceTypes: AssessmentEvidenceType[] | undefined
  if (body.evidenceTypes) {
    if (!Array.isArray(body.evidenceTypes)) {
      return NextResponse.json({ error: 'evidenceTypes must be an array' }, { status: 400 })
    }

    const invalid = body.evidenceTypes.filter(
      (value) => !EVIDENCE_TYPES.includes(value as (typeof EVIDENCE_TYPES)[number])
    )
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid evidence types: ${invalid.join(', ')}` },
        { status: 400 }
      )
    }

    evidenceTypes = body.evidenceTypes as AssessmentEvidenceType[]
  } else if (assessmentMode === 'AUTHENTIC') {
    evidenceTypes = ['TOOL_USAGE']
  }

  // TOOL_ASSESSMENT-specific validation
  let assessmentToolIds: string[] | undefined
  let minimumAttempts: number | undefined
  let assessmentWindowEnd: Date | undefined

  if (type === 'TOOL_ASSESSMENT') {
    const rawToolIds = body.assessmentToolIds
    if (!Array.isArray(rawToolIds) || rawToolIds.length === 0) {
      return NextResponse.json(
        { error: 'assessmentToolIds is required and must be a non-empty array for TOOL_ASSESSMENT' },
        { status: 400 },
      )
    }
    // Validate each tool exists
    const tools = await prisma.tool.findMany({
      where: { id: { in: rawToolIds } },
      select: { id: true },
    })
    if (tools.length !== rawToolIds.length) {
      const found = new Set(tools.map((t) => t.id))
      const missing = rawToolIds.filter((tid: string) => !found.has(tid))
      return NextResponse.json(
        { error: `Tools not found: ${missing.join(', ')}` },
        { status: 400 },
      )
    }
    assessmentToolIds = rawToolIds

    if (body.minimumAttempts != null) {
      const min = Number(body.minimumAttempts)
      if (isNaN(min) || min < 2 || min > 20) {
        return NextResponse.json(
          { error: 'minimumAttempts must be between 2 and 20' },
          { status: 400 },
        )
      }
      minimumAttempts = min
    } else {
      minimumAttempts = 3
    }

    if (body.assessmentWindowEnd) {
      const d = new Date(body.assessmentWindowEnd)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid assessmentWindowEnd date' }, { status: 400 })
      }
      assessmentWindowEnd = d
    }
  }

  const normalizedAssessmentConfig =
    assessmentConfig == null
      ? undefined
      : (assessmentConfig as Prisma.InputJsonObject)

  const assignment = await prisma.assignment.create({
    data: {
      courseId: id,
      title: String(title),
      description: description ? String(description) : undefined,
      type,
      toolId: toolId ? String(toolId) : undefined,
      // Ignore rubricId for TOOL_ASSESSMENT — MEI replaces rubrics
      rubricId: type === 'TOOL_ASSESSMENT' ? undefined : (rubricId ? String(rubricId) : undefined),
      dueAt: dueAt ? new Date(dueAt) : undefined,
      pointsPossible: Number(pointsPossible),
      canvasAssignmentId: canvasAssignmentId ? String(canvasAssignmentId) : undefined,
      isPublished: Boolean(isPublished ?? false),
      assessmentMode: assessmentMode
        ? (assessmentMode as (typeof ASSESSMENT_MODES)[number])
        : undefined,
      assessmentConfig: normalizedAssessmentConfig,
      evidenceTypes: evidenceTypes as PrismaEvidenceType[] | undefined,
      ...(type === 'TOOL_ASSESSMENT' && {
        assessmentToolIds,
        minimumAttempts,
        assessmentWindowEnd,
      }),
    },
    include: {
      rubric: { select: { id: true, title: true } },
      tool: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(assignment, { status: 201 })
})
