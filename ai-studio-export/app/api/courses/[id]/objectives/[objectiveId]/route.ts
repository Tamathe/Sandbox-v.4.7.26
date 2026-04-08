import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

async function requireInstructorOrAdmin(req: NextRequest, courseId: string) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) throw new Error('UNAUTHORIZED')
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } })
  if (!user) throw new Error('UNAUTHORIZED')
  if (user.role === 'ADMIN') return user
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } })
  if (!course) throw new Error('NOT_FOUND')
  if (course.instructorId !== user.id) throw new Error('FORBIDDEN')
  return user
}

// PATCH /api/courses/[id]/objectives/[objectiveId] — update a single objective
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; objectiveId: string }> }
) {
  try {
    const { id: courseId, objectiveId } = await params
    await requireInstructorOrAdmin(req, courseId)

    const body = await req.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title.trim() : undefined
    const description = typeof body?.description === 'string' ? body.description.trim() : undefined
    const moduleNumber = body?.moduleNumber !== undefined
      ? (body.moduleNumber === null ? null : Number(body.moduleNumber))
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
      },
    })

    return NextResponse.json({ objective: updated })
  } catch (err) {
    if (err instanceof Error && (err.message === 'UNAUTHORIZED')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update objective' }, { status: 500 })
  }
}

// DELETE /api/courses/[id]/objectives/[objectiveId] — delete a single objective
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; objectiveId: string }> }
) {
  try {
    const { id: courseId, objectiveId } = await params
    await requireInstructorOrAdmin(req, courseId)

    const objective = await prisma.learningObjective.findFirst({
      where: { id: objectiveId, courseId },
    })
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 })

    await prisma.learningObjective.delete({ where: { id: objectiveId } })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete objective' }, { status: 500 })
  }
}
