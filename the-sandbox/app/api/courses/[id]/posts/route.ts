import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireEducatorUser, requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import {
  createCoursePost,
  getCoursePostsByCourse,
  getAtRiskStudentsForCourse,
  getEnrolledStudents,
} from '../../../../lib/course-post-service'
import type { CoursePostType, CoursePostAudience } from '../../../../generated/prisma'

// GET — list posts for a course (educator view, includes all audiences + read counts)
export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id: courseId } = await context.params
  const url = req.nextUrl
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const include = url.searchParams.get('include') // "students" or "at-risk"

  const result = await getCoursePostsByCourse(courseId, limit, offset)

  // Optionally include student lists for the composer
  if (include === 'students') {
    const students = await getEnrolledStudents(courseId)
    return NextResponse.json({ ...result, students })
  }
  if (include === 'at-risk') {
    const atRisk = await getAtRiskStudentsForCourse(courseId)
    return NextResponse.json({ ...result, atRiskStudents: atRisk })
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST — create a new course post
export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id: courseId } = await context.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { title?: string; body?: string; type?: CoursePostType; audience?: CoursePostAudience; targetStudentIds?: string[]; channelPlatform?: boolean; channelEmail?: boolean; scheduledFor?: string; sandyGenerated?: boolean; sandyPrompt?: string }

  const post = await createCoursePost({
    courseId,
    authorId: auth.user.id,
    title: body.title,
    body: body.body as string,
    type: body.type || 'ANNOUNCEMENT',
    audience: body.audience || 'ALL',
    targetStudentIds: body.targetStudentIds,
    channelPlatform: body.channelPlatform,
    channelEmail: body.channelEmail,
    scheduledFor: body.scheduledFor,
    sandyGenerated: body.sandyGenerated,
    sandyPrompt: body.sandyPrompt,
  })

  return NextResponse.json(post, { status: 201 })
})
