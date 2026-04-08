import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { bootstrapDomainModality } from '../../../../lib/domain-modality-service'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

// GET — student joins a course via its enrollment key
// Used when a student clicks a shared enrollment link: /join/:enrollmentKey
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ enrollmentKey: string }> },
) => {
  const { enrollmentKey } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  const course = await prisma.course.findUnique({
    where: { enrollmentKey },
    select: { id: true, courseCode: true, title: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Course not found or enrollment link is invalid' }, { status: 404 })
  }

  // Enroll the student
  await prisma.courseEnrollment.upsert({
    where: { studentId_courseId: { studentId: user.id, courseId: course.id } },
    create: { studentId: user.id, courseId: course.id },
    update: {},
  })

  // CHAT-13: Auto-join the course ChatGroup if one exists
  const courseGroup = await prisma.chatGroup.findUnique({ where: { courseId: course.id } })
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

  // Redirect to the course page
  return NextResponse.redirect(new URL(`/courses/${course.id}`, req.url))
})
