import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { bootstrapDomainModality } from '../../../../lib/domain-modality-service'
import { withErrorHandling } from '../../../../lib/api-utils'

// POST — enroll current student in course
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id: courseId } = await params
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, courseCode: true } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  await prisma.courseEnrollment.upsert({
    where: { studentId_courseId: { studentId: user.id, courseId } },
    create: { studentId: user.id, courseId },
    update: {},
  })

  // CHAT-13: Auto-join the course ChatGroup if one exists
  const courseGroup = await prisma.chatGroup.findUnique({ where: { courseId } })
  if (courseGroup) {
    await prisma.chatMembership.upsert({
      where: { userId_groupId: { userId: user.id, groupId: courseGroup.id } },
      update: {},
      create: { userId: user.id, groupId: courseGroup.id, role: 'MEMBER' },
    }).catch(() => {}) // ignore if already a member
  }

  // Non-blocking cold-start modality bootstrap
  void bootstrapDomainModality(user.id, course.courseCode).catch((err) =>
    console.error('[domain-modality] bootstrap error', err)
  )
  revalidatePath('/courses')
  return NextResponse.json({ enrolled: true })
})

// DELETE — leave course
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id: courseId } = await params
  await prisma.courseEnrollment.deleteMany({ where: { studentId: user.id, courseId } })
  revalidatePath('/courses')
  return NextResponse.json({ left: true })
})
