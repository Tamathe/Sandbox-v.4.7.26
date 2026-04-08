import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { generateStudyPlan } from '../../lib/study-plan-service'
import { withErrorHandling } from '../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    if (user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { courseId?: string }
    if (!body?.courseId || typeof body.courseId !== 'string') {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const plan = await generateStudyPlan(user.id, body.courseId)
    return NextResponse.json(plan)
  })
