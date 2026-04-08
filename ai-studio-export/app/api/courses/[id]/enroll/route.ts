import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// POST — enroll current student in course
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: courseId } = await params
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  await prisma.courseEnrollment.upsert({
    where: { studentId_courseId: { studentId: user.id, courseId } },
    create: { studentId: user.id, courseId },
    update: {},
  })
  return NextResponse.json({ enrolled: true })
}

// DELETE — leave course
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: courseId } = await params
  await prisma.courseEnrollment.deleteMany({ where: { studentId: user.id, courseId } })
  return NextResponse.json({ left: true })
}
