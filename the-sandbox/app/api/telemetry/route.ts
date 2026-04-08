import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '../../generated/prisma'

import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Record<string, unknown>
  if (!body || typeof body.event !== 'string' || !body.payload) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { event, payload, sessionId } = body as {
    event: string
    payload: Prisma.InputJsonValue
    sessionId?: string
  }

  await prisma.sessionTelemetry.create({
    data: {
      userId: user.id,
      event,
      payload,
      sessionId: sessionId ?? null,
    },
  })

  return new NextResponse(null, { status: 204 })
})
