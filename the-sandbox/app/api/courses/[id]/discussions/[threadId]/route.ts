import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../generated/prisma'
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> }
) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id, threadId } = await params

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
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      posts: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  return NextResponse.json({ thread })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> }
) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id, threadId } = await params
  const body = await request.json().catch(() => null)

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

  if (!canModerateCourse(course, currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const thread = await prisma.discussionThread.findFirst({
    where: {
      id: threadId,
      courseId: id,
    },
    select: { id: true },
  })

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const updateData: { isPinned?: boolean; isLocked?: boolean } = {}
  if (body?.isPinned !== undefined) updateData.isPinned = Boolean(body.isPinned)
  if (body?.isLocked !== undefined) updateData.isLocked = Boolean(body.isLocked)

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
  }

  const updatedThread = await prisma.discussionThread.update({
    where: { id: threadId },
    data: updateData,
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

  return NextResponse.json(updatedThread)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> }
) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id, threadId } = await params

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

  const thread = await prisma.discussionThread.findFirst({
    where: {
      id: threadId,
      courseId: id,
    },
    select: {
      id: true,
      authorId: true,
    },
  })

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const canDelete = thread.authorId === currentUser.id || canModerateCourse(course, currentUser)
  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.discussionThread.delete({
    where: { id: threadId },
  })

  return NextResponse.json({ ok: true })
}
