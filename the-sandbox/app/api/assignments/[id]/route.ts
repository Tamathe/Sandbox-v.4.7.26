import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '../../../generated/prisma'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { ASSESSMENT_MODES, EVIDENCE_TYPES } from '../../../lib/assessment/types'

export const runtime = 'nodejs'

// GET /api/assignments/[id]
// Returns assignment + full rubric detail.
// Faculty: all fields. Students: only if published.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, instructorId: true } },
      tool: { select: { id: true, name: true, toolType: true } },
      rubric: {
        include: {
          criteria: {
            include: { bands: { orderBy: { minPoints: 'desc' } } },
            orderBy: { order: 'asc' },
          },
        },
      },
      _count: { select: { submissions: true } },
    },
  })

  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty =
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === assignment.course.instructorId)

  if (!isFaculty && !assignment.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Include student's own submission when the requester is a student
  let mySubmission = null
  if (user.role === 'STUDENT') {
    mySubmission = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: user.id } },
      select: {
        id: true,
        submittedAt: true,
        gradebookEntry: {
          select: { status: true, facultyScore: true, facultyFeedback: true },
        },
      },
    })
  }

  // For TOOL_ASSESSMENT, include meiSummary aggregate
  let meiSummary = null
  if (assignment.type === 'TOOL_ASSESSMENT') {
    const meiAgg = await prisma.masteryEfficiencyScore.aggregate({
      where: { assignmentId: id },
      _count: { id: true },
      _avg: { meiScore: true },
    })
    meiSummary = {
      scoredStudents: meiAgg._count.id,
      avgScore: meiAgg._avg.meiScore,
    }
  }

  return NextResponse.json({
    ...assignment,
    mySubmission,
    ...(meiSummary && { meiSummary }),
  })
})

// PATCH /api/assignments/[id]
// Faculty only — update any assignment field.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: { select: { instructorId: true } } },
  })
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty =
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === assignment.course.instructorId)
  if (!isFaculty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Record<string, unknown>

  const allowed = [
    'title',
    'description',
    'type',
    'toolId',
    'rubricId',
    'dueAt',
    'pointsPossible',
    'canvasAssignmentId',
    'isPublished',
    'acceptingLate',
    'assessmentMode',
    'processWeight',
    'assessmentConfig',
  ]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      if (key === 'dueAt') {
        if (body[key]) {
          const d = new Date(body[key] as string)
          if (isNaN(d.getTime())) {
            return NextResponse.json({ error: 'Invalid dueAt date' }, { status: 400 })
          }
          data[key] = d
        } else {
          data[key] = null
        }
      } else if (key === 'pointsPossible') {
        const n = Number(body[key])
        if (isNaN(n) || n < 0 || n > 10_000) {
          return NextResponse.json({ error: 'pointsPossible must be a number between 0 and 10000' }, { status: 400 })
        }
        data[key] = n
      } else if (key === 'processWeight') {
        if (body[key] == null || body[key] === '') {
          data[key] = null
        } else {
          const n = Number(body[key])
          if (isNaN(n) || n < 0 || n > 1) {
            return NextResponse.json({ error: 'processWeight must be a number between 0 and 1' }, { status: 400 })
          }
          data[key] = n
        }
      } else if (key === 'assessmentMode') {
        if (!ASSESSMENT_MODES.includes(String(body[key]) as (typeof ASSESSMENT_MODES)[number])) {
          return NextResponse.json({ error: 'Invalid assessmentMode' }, { status: 400 })
        }
        data[key] = body[key]
      } else if (key === 'assessmentConfig') {
        if (body[key] == null || body[key] === '') {
          data[key] = null
        } else if (typeof body[key] !== 'object' || Array.isArray(body[key])) {
          return NextResponse.json({ error: 'assessmentConfig must be an object' }, { status: 400 })
        } else {
          data[key] = body[key] as Prisma.InputJsonValue
        }
      } else if (key === 'isPublished' || key === 'acceptingLate') {
        data[key] = Boolean(body[key])
      } else {
        data[key] = body[key] === '' ? null : body[key]
      }
    }
  }

  if ('evidenceTypes' in body) {
    if (!Array.isArray(body.evidenceTypes)) {
      return NextResponse.json({ error: 'evidenceTypes must be an array' }, { status: 400 })
    }

    const evidenceTypes = body.evidenceTypes.map((value) => String(value))
    const invalid = evidenceTypes.filter(
      (value) => !EVIDENCE_TYPES.includes(value as (typeof EVIDENCE_TYPES)[number])
    )
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid evidence types: ${invalid.join(', ')}` }, { status: 400 })
    }

    data.evidenceTypes = evidenceTypes
  }

  // Determine effective type (updated or existing)
  const effectiveType = (data.type as string) ?? assignment.type

  // TOOL_ASSESSMENT-specific field handling
  if (effectiveType === 'TOOL_ASSESSMENT') {
    // Ignore rubricId — TOOL_ASSESSMENT uses MEI, not rubrics
    delete data.rubricId

    if ('assessmentToolIds' in body) {
      const rawToolIds = body.assessmentToolIds
      if (!Array.isArray(rawToolIds) || rawToolIds.length === 0) {
        return NextResponse.json(
          { error: 'assessmentToolIds must be a non-empty array for TOOL_ASSESSMENT' },
          { status: 400 },
        )
      }
      const tools = await prisma.tool.findMany({
        where: { id: { in: rawToolIds } },
        select: { id: true },
      })
      if (tools.length !== rawToolIds.length) {
        const found = new Set(tools.map((t: { id: string }) => t.id))
        const missing = rawToolIds.filter((tid: string) => !found.has(tid))
        return NextResponse.json(
          { error: `Tools not found: ${missing.join(', ')}` },
          { status: 400 },
        )
      }
      data.assessmentToolIds = rawToolIds
    }

    if ('minimumAttempts' in body) {
      const min = Number(body.minimumAttempts)
      if (isNaN(min) || min < 2 || min > 20) {
        return NextResponse.json(
          { error: 'minimumAttempts must be between 2 and 20' },
          { status: 400 },
        )
      }
      data.minimumAttempts = min
    }

    if ('assessmentWindowEnd' in body) {
      if (body.assessmentWindowEnd) {
        const d = new Date(body.assessmentWindowEnd as string)
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Invalid assessmentWindowEnd date' }, { status: 400 })
        }
        data.assessmentWindowEnd = d
      } else {
        data.assessmentWindowEnd = null
      }
    }
  }

  try {
    const updated = await prisma.assignment.update({ where: { id }, data })
    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('PATCH /api/assignments/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }
})

// DELETE /api/assignments/[id]
// Faculty only.
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: { select: { instructorId: true } } },
  })
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty =
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === assignment.course.instructorId)
  if (!isFaculty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.assignment.delete({ where: { id } })
  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
