import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import { CreateDiscussionThreadSchema } from '../../../../lib/schemas'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma: PrismaClient = new PrismaClient({ adapter })

function truncateContent(content: string, limit: number) {
  if (content.length <= limit) return content
  return `${content.slice(0, limit - 3)}...`
}

function canAccessCourse(
  course: { instructorId: string; isPublic: boolean },
  currentUser: { id: string; role: string }
) {
  if (currentUser.role === 'ADMIN') return true
  if (course.isPublic) return true
  return currentUser.id === course.instructorId
}

function canModerateCourse(
  course: { instructorId: string },
  currentUser: { id: string; role: string }
) {
  return currentUser.role === 'ADMIN' || currentUser.id === course.instructorId
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      instructorId: true,
      isPublic: true,
    },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!canAccessCourse(course, currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const threads = await prisma.discussionThread.findMany({
    where: { courseId: id },
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  return NextResponse.json(
    threads.map((thread) => ({
      ...thread,
      content: truncateContent(thread.content, 200),
    }))
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  const parsed = await parseRequestBody(request)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(CreateDiscussionThreadSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { title, body: content, isPinned: requestedPinned = false } = validation.value

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      instructorId: true,
      isPublic: true,
    },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!canAccessCourse(course, currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (requestedPinned && !canModerateCourse(course, currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const thread = await prisma.discussionThread.create({
    data: {
      title,
      content,
      courseId: id,
      authorId: currentUser.id,
      isPinned: requestedPinned && canModerateCourse(course, currentUser),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  return NextResponse.json(thread, { status: 201 })
}
