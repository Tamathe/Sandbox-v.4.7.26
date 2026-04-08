import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  createConfidenceCheck, resolveConfidenceCheck,
  getCalibrationHistory, getCalibrationSummary,
} from '../../../lib/reflect-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'summary') {
    const summary = await getCalibrationSummary(auth.user.id)
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const history = await getCalibrationHistory(auth.user.id)
  return NextResponse.json({ checks: history }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    action?: string
    checkId?: string
    actualScore?: number
    sessionId?: string
    concept?: string
    predictedScore?: number
    courseId?: string
  }

  if (body.action === 'resolve') {
    if (!body.checkId || !body.actualScore) {
      return NextResponse.json({ error: 'checkId and actualScore required' }, { status: 400 })
    }
    const check = await resolveConfidenceCheck(auth.user.id, body.checkId, {
      actualScore: body.actualScore,
      sessionId: body.sessionId,
    })
    if (!check) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ check }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!body.concept || !body.predictedScore) {
    return NextResponse.json({ error: 'concept and predictedScore required' }, { status: 400 })
  }

  const check = await createConfidenceCheck(auth.user.id, {
    concept: body.concept,
    predictedScore: body.predictedScore,
    courseId: body.courseId,
  })
  return NextResponse.json({ check }, { status: 201 })
})
