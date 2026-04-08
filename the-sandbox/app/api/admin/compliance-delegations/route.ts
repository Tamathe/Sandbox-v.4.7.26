import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listAllDelegations, createDelegation, isValidDelegationScope } from '../../../lib/compliance-delegation-service'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const delegations = await listAllDelegations()
    return NextResponse.json({ delegations }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    delegatorEmail: string
    delegateEmail: string
    scope: string
    validUntil?: string
    reason?: string
  }>(request)
  if ('error' in body) return body.error

  const { delegatorEmail, delegateEmail, scope, validUntil, reason } = body.data
  if (!delegatorEmail || !delegateEmail || !scope) {
    return NextResponse.json({ error: 'delegatorEmail, delegateEmail, and scope are required' }, { status: 400 })
  }
  if (!isValidDelegationScope(scope)) {
    return NextResponse.json({ error: 'Invalid scope. Must be: full, training, incidents, documents, or reviews' }, { status: 400 })
  }

  const [delegator, delegate] = await Promise.all([
    prisma.user.findUnique({ where: { email: delegatorEmail }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: delegateEmail }, select: { id: true } }),
  ])
  if (!delegator) return NextResponse.json({ error: 'Delegator user not found' }, { status: 404 })
  if (!delegate) return NextResponse.json({ error: 'Delegate user not found' }, { status: 404 })

    const delegation = await createDelegation({
      delegatorId: delegator.id,
      delegateId: delegate.id,
      scope,
      validUntil,
      reason,
    })
    return NextResponse.json({ delegation }, { status: 201 })

})
