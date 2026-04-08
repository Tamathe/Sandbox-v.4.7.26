import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { CreateCourseSchema } from '../../lib/schemas'

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

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(CreateCourseSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { courseCode, title, description, isPublic } = validation.value

  try {
    const course = await prisma.course.create({
      data: {
        courseCode: courseCode.toUpperCase(),
        title,
        description: description ?? null,
        instructorId: user.id,
        isPublic: isPublic ?? true,
      },
    })
    return NextResponse.json(course, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Course code already exists' }, { status: 409 })
  }
}
