import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { removeCourseFromPlan, updatePlannedCourse } from '../../../../../lib/degree-plan-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; entryId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const { planId, entryId } = await params
    const removed = await removeCourseFromPlan(planId, entryId, user.id)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return new NextResponse(null, { status: 204 })
  })

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; entryId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const { planId, entryId } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { semester, year, status } = parsed.data as { semester?: string; year?: number; status?: string }

    const entry = await updatePlannedCourse(planId, entryId, user.id, { semester, year, status })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(entry)
  })
