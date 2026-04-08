import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { z } from 'zod'
import { submitQuestion, getStudentQuestions } from '../../lib/office-hours-service'
import { withErrorHandling } from '../../lib/api-utils'

const SubmitSchema = z.object({
  courseId: z.string().min(1),
  question: z.string().min(10, 'Question must be at least 10 characters'),
  context: z.string().optional(),
  assignmentId: z.string().optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(SubmitSchema, parsed.data)
    if ('error' in v) return v.error

    const { courseId, question, context, assignmentId } = v.value
    const result = await submitQuestion(auth.user.id, courseId, question, context, assignmentId)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const courseId = req.nextUrl.searchParams.get('courseId') || undefined
    const questions = await getStudentQuestions(auth.user.id, courseId)
    return NextResponse.json({ questions }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
