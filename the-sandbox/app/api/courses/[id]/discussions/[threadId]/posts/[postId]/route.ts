import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

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

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string; postId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const currentUser = auth.user

  const { id, threadId, postId } = await params

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

  const post = await prisma.discussionPost.findFirst({
    where: {
      id: postId,
      threadId,
    },
    select: {
      id: true,
      authorId: true,
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const canDelete = post.authorId === currentUser.id || canModerateCourse(course, currentUser)
  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.$transaction([
    prisma.discussionPost.deleteMany({
      where: { parentId: postId },
    }),
    prisma.discussionPost.delete({
      where: { id: postId },
    }),
    prisma.discussionThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true })
})
