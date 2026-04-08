import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

async function getUser(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

function canManageCourse(
  course: { instructorId: string },
  user: { id: string; role: string } | null
) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'EDUCATOR' && user.id === course.instructorId
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; toolId: string }> }
) {
  const { id, toolId } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!canManageCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existingLink = await prisma.courseToolLink.findUnique({
    where: {
      courseId_toolId: {
        courseId: id,
        toolId,
      },
    },
  })

  if (!existingLink) {
    return NextResponse.json({ error: 'Linked tool not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const syllabusContext =
    body.syllabusContext === undefined ? undefined : String(body.syllabusContext || '').trim() || null
  const weekLabel =
    body.weekLabel === undefined ? undefined : String(body.weekLabel || '').trim() || null
  const displayOrder =
    body.displayOrder !== undefined && Number.isFinite(Number(body.displayOrder))
      ? Number(body.displayOrder)
      : undefined

  const updated = await prisma.courseToolLink.update({
    where: {
      courseId_toolId: {
        courseId: id,
        toolId,
      },
    },
    data: {
      ...(syllabusContext !== undefined ? { syllabusContext } : {}),
      ...(weekLabel !== undefined ? { weekLabel } : {}),
      ...(displayOrder !== undefined ? { displayOrder } : {}),
    },
    select: {
      courseId: true,
      toolId: true,
      syllabusContext: true,
      weekLabel: true,
      displayOrder: true,
    },
  })

  return NextResponse.json(updated)
}
