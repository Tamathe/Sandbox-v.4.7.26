import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listExceptions, createException, isValidExceptionType } from '../../../lib/compliance-exception-service'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? undefined
  const userId = url.searchParams.get('userId') ?? undefined
  const requirementId = url.searchParams.get('requirementId') ?? undefined

    const exceptions = await listExceptions({ status, userId, requirementId })
    return NextResponse.json({ exceptions }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    userEmail?: string
    requirementId?: string
    exceptionType: string
    reason: string
    validFrom?: string
    validUntil: string
  }>(request)
  if ('error' in body) return body.error

  const { userEmail, requirementId, exceptionType, reason, validFrom, validUntil } = body.data
  if (!exceptionType || !reason || !validUntil) {
    return NextResponse.json({ error: 'exceptionType, reason, and validUntil are required' }, { status: 400 })
  }
  if (!isValidExceptionType(exceptionType)) {
    return NextResponse.json({ error: 'Invalid exceptionType. Must be: waiver, extension, exemption, or accommodation' }, { status: 400 })
  }

  let userId: string | null = null
  if (userEmail) {
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    userId = user.id
  }

    const exception = await createException({
      userId,
      requirementId: requirementId ?? null,
      exceptionType,
      reason,
      grantedBy: auth.user.id,
      validFrom,
      validUntil,
    })
    return NextResponse.json({ exception }, { status: 201 })

})
