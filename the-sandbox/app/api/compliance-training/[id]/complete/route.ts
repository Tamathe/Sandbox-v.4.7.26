import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { recordCompletion } from '../../../../lib/compliance-training-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id: moduleId } = await params
  const body = await parseRequestBody<{ score: number }>(request)
  if ('error' in body) return body.error

  const { score } = body.data
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json({ error: 'score must be 0-100' }, { status: 400 })
  }

  try {
    const completion = await recordCompletion(auth.user.id, moduleId, score)
    return NextResponse.json({ completion })
  } catch (error) {
    console.error('[COMPLIANCE] record completion error:', error)
    return NextResponse.json({ error: 'Failed to record completion' }, { status: 500 })
  }
})
