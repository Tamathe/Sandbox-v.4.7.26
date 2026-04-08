import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { getDegreePlan, updateDegreePlan, deleteDegreePlan } from '../../../lib/degree-plan-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ planId: string }> }) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const { planId } = await params
    const plan = await getDegreePlan(planId, user.id)
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(plan, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ planId: string }> }) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const { planId } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const { title, targetGradYear, targetGradSemester } = parsed.data as { title?: string; targetGradYear?: number; targetGradSemester?: string }

    const plan = await updateDegreePlan(planId, user.id, { title, targetGradYear, targetGradSemester })
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(plan, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ planId: string }> }) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const { planId } = await params
    const deleted = await deleteDegreePlan(planId, user.id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return new NextResponse(null, { status: 204 })
  })
