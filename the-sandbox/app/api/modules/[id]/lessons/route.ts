import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { CourseService, CoursePermissionError, CourseValidationError } from '../../../../lib/courses/course-service'
import type { LessonType } from '../../../../generated/prisma'

const VALID_TYPES: LessonType[] = ['READING', 'TOOL', 'CHATBOT', 'VIDEO', 'ASSESSMENT']

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id: moduleId } = await params
  const body = await req.json().catch(() => ({}))
  const { title, type, contentRef } = body ?? {}
  if (!title || typeof title !== 'string') return NextResponse.json({ error: 'title required' }, { status: 400 })
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'invalid lesson type' }, { status: 400 })

  try {
    const lesson = await CourseService.addLesson(auth.user, moduleId, { title, type, contentRef: contentRef ?? {} })
    return NextResponse.json(lesson, { status: 201 })
  } catch (err) {
    if (err instanceof CoursePermissionError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof CourseValidationError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
})
