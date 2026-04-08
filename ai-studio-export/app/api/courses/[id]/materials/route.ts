import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

function normalizeModuleNumber(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return null
  return Math.min(99, Math.max(1, parsed))
}

async function getUserFromHeader(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

function canAccessCourse(
  course: { instructorId: string; isPublic: boolean },
  user: { id: string; role: string } | null
) {
  if (user?.role === 'ADMIN') return true
  if (course.isPublic) return true
  return user?.id === course.instructorId
}

function canManageCourse(
  course: { instructorId: string },
  user: { id: string; role: string } | null
) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'EDUCATOR' && user.id === course.instructorId
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromHeader(req)

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true, isPublic: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!canAccessCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const materials = await prisma.courseMaterial.findMany({
    where: {
      courseId: id,
      ...(user?.role === 'STUDENT' || !user ? { isVisible: true } : {}),
    },
    orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(materials)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromHeader(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (!canManageCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.title || !body.content) {
    return NextResponse.json({ error: 'title and content required' }, { status: 400 })
  }

  const material = await prisma.courseMaterial.create({
    data: {
      courseId: id,
      title: String(body.title),
      content: String(body.content),
      materialType: body.materialType ? String(body.materialType) : 'lecture',
      moduleNumber: normalizeModuleNumber(body.moduleNumber),
      isVisible: body.isVisible ?? true,
    },
  })

  return NextResponse.json(material, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromHeader(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (!canManageCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { materialId, isVisible, title, content, materialType, moduleNumber } = body
  if (!materialId) {
    return NextResponse.json({ error: 'materialId required' }, { status: 400 })
  }

  const material = await prisma.courseMaterial.findFirst({
    where: { id: String(materialId), courseId: id },
    select: { id: true },
  })
  if (!material) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.courseMaterial.update({
    where: { id: material.id },
    data: {
      ...(isVisible !== undefined ? { isVisible: Boolean(isVisible) } : {}),
      ...(title !== undefined ? { title: String(title) } : {}),
      ...(content !== undefined ? { content: String(content) } : {}),
      ...(materialType !== undefined ? { materialType: String(materialType) } : {}),
      ...(moduleNumber !== undefined
        ? { moduleNumber: moduleNumber ? normalizeModuleNumber(moduleNumber) : null }
        : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromHeader(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (!canManageCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const materialId = req.nextUrl.searchParams.get('materialId')
  if (!materialId) return NextResponse.json({ error: 'materialId required' }, { status: 400 })

  const material = await prisma.courseMaterial.findFirst({
    where: { id: materialId, courseId: id },
    select: { id: true },
  })
  if (!material) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.courseMaterial.delete({ where: { id: material.id } })
  return NextResponse.json({ ok: true })
}
