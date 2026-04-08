import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null

  const courses = await prisma.course.findMany({
    where: user?.role === 'ADMIN'
      ? {}
      : { OR: [{ isPublic: true }, ...(user ? [{ instructorId: user.id }] : [])] },
    include: {
      instructor: { select: { name: true, email: true } },
      _count: { select: { materials: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(courses)
}

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || (user.role !== 'EDUCATOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.courseCode || !body.title) {
    return NextResponse.json({ error: 'courseCode and title required' }, { status: 400 })
  }

  try {
    const course = await prisma.course.create({
      data: {
        courseCode: body.courseCode.toUpperCase(),
        title: body.title,
        description: body.description ?? null,
        instructorId: user.id,
        isPublic: body.isPublic ?? true,
      },
    })
    return NextResponse.json(course, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Course code already exists' }, { status: 409 })
  }
}
