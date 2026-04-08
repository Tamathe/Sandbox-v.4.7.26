import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma: PrismaClient = new PrismaClient({ adapter })

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> }
) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id, threadId } = await params
  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const parentId = typeof body?.parentId === 'string' ? body.parentId : null

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

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

  const thread = await prisma.discussionThread.findFirst({
    where: {
      id: threadId,
      courseId: id,
    },
    select: {
      id: true,
      isLocked: true,
    },
  })

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  if (thread.isLocked && !canModerateCourse(course, currentUser)) {
    return NextResponse.json({ error: 'Thread is locked' }, { status: 403 })
  }

  if (parentId) {
    const parentPost = await prisma.discussionPost.findFirst({
      where: {
        id: parentId,
        threadId,
      },
      select: {
        id: true,
        parentId: true,
      },
    })

    if (!parentPost) {
      return NextResponse.json({ error: 'Parent post not found' }, { status: 404 })
    }

    if (parentPost.parentId) {
      return NextResponse.json({ error: 'Nested replies are limited to one level' }, { status: 400 })
    }
  }

  const [post] = await prisma.$transaction([
    prisma.discussionPost.create({
      data: {
        content,
        authorId: currentUser.id,
        threadId,
        parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    }),
    prisma.discussionThread.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
      },
    }),
  ])

  return NextResponse.json(post, { status: 201 })
}
