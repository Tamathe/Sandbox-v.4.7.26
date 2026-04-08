import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../lib/server-auth'
import { getDegreePlansForUser, createDegreePlan } from '../../lib/degree-plan-service'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const plans = await getDegreePlansForUser(user.id)
    return NextResponse.json(plans, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { title, programId, targetGradYear, targetGradSemester } = parsed.data as { title: string; programId: string; targetGradYear?: number; targetGradSemester?: string }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!programId?.trim()) {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 })
    }

    const plan = await createDegreePlan(user.id, {
      title: title.trim(),
      programId: programId.trim(),
      targetGradYear,
      targetGradSemester,
    })
    return NextResponse.json(plan, { status: 201 })
  })
