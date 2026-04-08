import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { syncCourseMaterialGovernance } from '../../../../lib/content-permissions'
import { prisma } from '../../../../lib/prisma'
import { getCourseGovernanceSummary } from '../../../../lib/provenance-service'
import {
  isAuthFailure,
  requireCourseOwner,
  requireRequestUser,
  parseRequestBody,
} from '../../../../lib/server-auth'

function canAccessCourse(
  course: {
    instructorId: string
    isPublic: boolean
    enrollments?: Array<{ studentId: string }>
  },
  user: { id: string; role: string },
) {
  if (user.role === 'ADMIN') return true
  if (course.instructorId === user.id) return true
  if (course.isPublic) return true
  return (course.enrollments ?? []).some((enrollment) => enrollment.studentId === user.id)
}

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        instructorId: true,
        isPublic: true,
        ...(auth.user.role === 'STUDENT'
          ? {
              enrollments: {
                where: { studentId: auth.user.id },
                select: { studentId: true },
                take: 1,
              },
            }
          : {}),
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!canAccessCourse(course, auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const summary = await getCourseGovernanceSummary({
      courseId: id,
      viewer: { id: auth.user.id, role: auth.user.role },
    })

    if (!summary) {
      return NextResponse.json({ error: 'Course governance not available' }, { status: 404 })
    }

    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  },
)

export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const auth = await requireCourseOwner(req, id)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { facultyAiRetrievalApproved?: boolean; studentUploadsAllowed?: boolean; transcriptGenerationAllowed?: boolean; classroomRecordingAllowed?: boolean }
    const updateData = {
      ...(body.facultyAiRetrievalApproved !== undefined
        ? { facultyAiRetrievalApproved: Boolean(body.facultyAiRetrievalApproved) }
        : {}),
      ...(body.studentUploadsAllowed !== undefined
        ? { studentUploadsAllowed: Boolean(body.studentUploadsAllowed) }
        : {}),
      ...(body.transcriptGenerationAllowed !== undefined
        ? { transcriptGenerationAllowed: Boolean(body.transcriptGenerationAllowed) }
        : {}),
      ...(body.classroomRecordingAllowed !== undefined
        ? { classroomRecordingAllowed: Boolean(body.classroomRecordingAllowed) }
        : {}),
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.course.update({
        where: { id },
        data: updateData,
      })
      await syncCourseMaterialGovernance(id)
    }

    const summary = await getCourseGovernanceSummary({
      courseId: id,
      viewer: { id: auth.user.id, role: auth.user.role },
    })

    if (!summary) {
      return NextResponse.json({ error: 'Course governance not available' }, { status: 404 })
    }

    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  },
)
