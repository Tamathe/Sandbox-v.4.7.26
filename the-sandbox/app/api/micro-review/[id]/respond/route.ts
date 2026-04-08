import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { submitMicroReviewResponse } from '../../../../lib/micro-review-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const { id } = await params

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { answer?: string; skipped?: boolean; responseTimeMs?: number }

    const result = await submitMicroReviewResponse(
      id,
      user.id,
      body.answer ?? null,
      body.skipped === true,
      body.responseTimeMs,
    )

    return NextResponse.json(result)
  })
