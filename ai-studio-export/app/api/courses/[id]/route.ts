import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || (user.role !== 'EDUCATOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (course.instructorId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.course.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || (user.role !== 'EDUCATOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (course.instructorId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, isPublic } = await req.json()

  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: String(title) } : {}),
      ...(description !== undefined ? { description: description ? String(description) : null } : {}),
      ...(isPublic !== undefined ? { isPublic: Boolean(isPublic) } : {}),
    },
  })

  return NextResponse.json(updated)
}
