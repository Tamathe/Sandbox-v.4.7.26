import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import {
  getOnboardingStatus,
  submitOnboardingStep,
  completeOnboarding,
} from '../../../../lib/ai-literacy/student-onboarding-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const status = await getOnboardingStatus(auth.user.id)
  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { step: number; data?: Record<string, unknown>; final?: boolean }
  const { step, data, final } = body

  if (typeof step !== 'number' || step < 1 || step > 4) {
    return NextResponse.json({ error: 'Invalid step (1-4)' }, { status: 400 })
  }

  if (final) {
    const result = await completeOnboarding(auth.user.id, data ?? {})
    return NextResponse.json(result)
  }

  const result = await submitOnboardingStep(auth.user.id, step, data ?? {})
  return NextResponse.json(result)
})
