import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { AssessmentService } from '../../../../lib/courses/assessment-service'
import { CoursePermissionError, CourseValidationError } from '../../../../lib/courses/course-service'
import { EnrollmentError } from '../../../../lib/courses/enrollment-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const payload = (body?.payload ?? {}) as Record<string, unknown>

  try {
    const submission = await AssessmentService.submit(auth.user, id, payload)
    return NextResponse.json(submission, { status: 201 })
  } catch (err) {
    if (err instanceof CoursePermissionError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof CourseValidationError) return NextResponse.json({ error: err.message }, { status: 400 })
    if (err instanceof EnrollmentError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
})
