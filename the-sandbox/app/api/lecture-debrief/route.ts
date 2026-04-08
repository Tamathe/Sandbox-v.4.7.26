import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { z } from 'zod'
import { createDebrief, listDebriefs } from '../../lib/lecture-debrief-service'
import { withErrorHandling } from '../../lib/api-utils'

const CreateSchema = z.object({
  courseId: z.string().min(1),
  rawInput: z.string().min(50, 'Lecture notes must be at least 50 characters'),
  lectureDate: z.string().optional(),
  title: z.string().optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(CreateSchema, parsed.data)
    if ('error' in v) return v.error

    const { courseId, rawInput, lectureDate, title } = v.value
    const date = lectureDate ? new Date(lectureDate) : undefined

    const debrief = await createDebrief(auth.user.id, courseId, rawInput, date, title)
    return NextResponse.json(debrief, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const courseId = req.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 })
    }

    const publishedOnly = auth.user.role === 'STUDENT'
    const debriefs = await listDebriefs(courseId, auth.user.id, { publishedOnly })
    return NextResponse.json({ debriefs }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
