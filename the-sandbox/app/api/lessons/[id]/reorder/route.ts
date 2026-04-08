import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { CourseService, CoursePermissionError, CourseValidationError } from '../../../../lib/courses/course-service'

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const newOrder = Number(body?.order)
  if (!Number.isInteger(newOrder) || newOrder < 0) {
    return NextResponse.json({ error: 'order must be a non-negative integer' }, { status: 400 })
  }

  try {
    const lesson = await CourseService.reorderLesson(auth.user, id, newOrder)
    return NextResponse.json(lesson)
  } catch (err) {
    if (err instanceof CoursePermissionError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof CourseValidationError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
})
