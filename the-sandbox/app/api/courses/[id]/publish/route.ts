import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { CourseService, CoursePermissionError, CourseValidationError } from '../../../../lib/courses/course-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  try {
    const course = await CourseService.publish(auth.user, id)
    return NextResponse.json(course)
  } catch (err) {
    if (err instanceof CoursePermissionError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof CourseValidationError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
})
