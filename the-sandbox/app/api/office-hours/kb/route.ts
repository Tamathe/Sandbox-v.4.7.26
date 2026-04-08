import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'
import { getKnowledgeBase, addKBEntry } from '../../../lib/office-hours-service'
import { withErrorHandling } from '../../../lib/api-utils'

const AddKBSchema = z.object({
  courseId: z.string().min(1),
  question: z.string().min(5),
  answer: z.string().min(5),
})

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const courseId = req.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 })
    }

    const entries = await getKnowledgeBase(courseId)
    return NextResponse.json({ entries }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(AddKBSchema, parsed.data)
    if ('error' in v) return v.error

    const entry = await addKBEntry(v.value.courseId, auth.user.id, v.value.question, v.value.answer)
    return NextResponse.json(entry, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
