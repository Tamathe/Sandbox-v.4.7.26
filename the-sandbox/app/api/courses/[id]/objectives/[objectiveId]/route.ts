import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'

// PATCH /api/courses/[id]/objectives/[objectiveId] — update a single objective
export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; objectiveId: string }> }
) => {
  const { id: courseId, objectiveId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  try {
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { title?: string; description?: string; moduleNumber?: number | null; bloomLevel?: string }
    const title = typeof body?.title === 'string' ? body.title.trim() : undefined
    const description = typeof body?.description === 'string' ? body.description.trim() : undefined
    const moduleNumber = body?.moduleNumber !== undefined
      ? (body.moduleNumber === null ? null : Number(body.moduleNumber))
      : undefined
    const VALID_BLOOM_LEVELS = new Set(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
    const bloomLevel = typeof body?.bloomLevel === 'string' && VALID_BLOOM_LEVELS.has(body.bloomLevel.toLowerCase())
      ? body.bloomLevel.toUpperCase()
      : undefined

    if (title !== undefined && !title) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    }

    const objective = await prisma.learningObjective.findFirst({
      where: { id: objectiveId, courseId },
    })
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 })

    const updated = await prisma.learningObjective.update({
      where: { id: objectiveId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(moduleNumber !== undefined && { moduleNumber }),
        ...(bloomLevel !== undefined && { bloomLevel }),
      },
    })

    return NextResponse.json({ objective: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update objective' }, { status: 500 })
  }
})

// DELETE /api/courses/[id]/objectives/[objectiveId] — delete a single objective
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; objectiveId: string }> }
) => {
  const { id: courseId, objectiveId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  try {
    const objective = await prisma.learningObjective.findFirst({
      where: { id: objectiveId, courseId },
    })
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 })

    await prisma.learningObjective.delete({ where: { id: objectiveId } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete objective' }, { status: 500 })
  }
})
