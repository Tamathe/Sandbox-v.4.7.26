import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updateBenchmark } from '../../../../lib/compliance-benchmark-service'

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const body = await parseRequestBody<{ targetValue?: number; notes?: string }>(request)
  if ('error' in body) return body.error

    const benchmark = await updateBenchmark(id, body.data)
    return NextResponse.json({ benchmark })

})
