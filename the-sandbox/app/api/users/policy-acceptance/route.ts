import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { recordAcceptance, getUserAcceptanceHistory } from '../../../lib/policy-acceptance-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const history = await getUserAcceptanceHistory(auth.user.id)
  return NextResponse.json({ history }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    policyType: string
    policyVersion: string
  }>(request)
  if ('error' in body) return body.error

  const { policyType, policyVersion } = body.data
  if (!policyType || !policyVersion) {
    return NextResponse.json({ error: 'policyType and policyVersion are required' }, { status: 400 })
  }

  const validTypes = ['tos', 'privacy', 'ferpa', 'data-processing', 'acceptable-use']
  if (!validTypes.includes(policyType)) {
    return NextResponse.json({ error: `Invalid policyType. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined
  const userAgent = request.headers.get('user-agent') ?? undefined

  const record = await recordAcceptance({
    userId: auth.user.id,
    policyType,
    policyVersion,
    ipAddress,
    userAgent,
  })

  return NextResponse.json({ record }, { status: 201 })
})
