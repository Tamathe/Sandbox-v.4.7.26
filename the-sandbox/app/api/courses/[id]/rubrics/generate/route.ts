import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { generateAndSaveRubric } from '../../../../../lib/assignment-builder'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

// ── POST /api/courses/[id]/rubrics/generate ───────────────────────────────────
// Calls Haiku to generate a rubric from an assignment's learning objectives,
// persists it, and returns the full rubric with criteria and bands.
//
// Body:
//   assignmentTitle       string   (required)
//   assignmentDescription string   (optional)
//   pointsPossible        number   (required, > 0)
//   toolId                string   (optional — pulls learningObjectives from tool)
//   objectives            string[] (optional override list)

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const auth = await requireRequestUser(req, { requireEducator: true })
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  // Verify course access
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const canManage = user.role === 'ADMIN' || (user.role === 'EDUCATOR' && course.instructorId === user.id)
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse + validate body
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { assignmentTitle, assignmentDescription, pointsPossible, toolId, objectives } = parsed.data as {
    assignmentTitle?: unknown
    assignmentDescription?: unknown
    pointsPossible?: unknown
    toolId?: unknown
    objectives?: unknown
  }

  if (!assignmentTitle || typeof assignmentTitle !== 'string' || !assignmentTitle.trim()) {
    return NextResponse.json({ error: 'assignmentTitle is required' }, { status: 400 })
  }
  if (typeof pointsPossible !== 'number' || pointsPossible <= 0) {
    return NextResponse.json({ error: 'pointsPossible must be a positive number' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI rubric generation requires ANTHROPIC_API_KEY' },
      { status: 503 },
    )
  }

  try {
    const rubric = await generateAndSaveRubric({
      courseId: id,
      assignmentTitle: assignmentTitle.trim(),
      assignmentDescription: typeof assignmentDescription === 'string' ? assignmentDescription.trim() : undefined,
      pointsPossible,
      toolId: typeof toolId === 'string' ? toolId : undefined,
      objectives: Array.isArray(objectives) ? (objectives as string[]) : undefined,
    })
    return NextResponse.json(rubric, { status: 201 })
  } catch (err) {
    console.error('[rubric-generate]', err)
    return NextResponse.json(
      { error: 'Failed to generate rubric. Please try again.' },
      { status: 500 },
    )
  }
})
