import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const prefs = await prisma.successAlertPreference.findUnique({
    where: { userId: user.id },
  })

  return NextResponse.json(prefs ?? {
    minSeverity: 'CONCERN',
    emailDigest: true,
    briefingInject: true,
    sandyNotify: true,
    batchWindow: 24,
    quietStart: null,
    quietEnd: null,
  })
})

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { minSeverity, emailDigest, briefingInject, sandyNotify, batchWindow, quietStart, quietEnd } = parsed.data as {
    minSeverity?: string
    emailDigest?: boolean
    briefingInject?: boolean
    sandyNotify?: boolean
    batchWindow?: number
    quietStart?: number | null
    quietEnd?: number | null
  }

  const prefs = await prisma.successAlertPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      minSeverity: (minSeverity as 'WATCH' | 'CONCERN' | 'URGENT' | 'CRITICAL') ?? 'CONCERN',
      emailDigest: emailDigest ?? true,
      briefingInject: briefingInject ?? true,
      sandyNotify: sandyNotify ?? true,
      batchWindow: batchWindow ?? 24,
      quietStart: quietStart ?? null,
      quietEnd: quietEnd ?? null,
    },
    update: {
      ...(minSeverity !== undefined && { minSeverity: minSeverity as 'WATCH' | 'CONCERN' | 'URGENT' | 'CRITICAL' }),
      ...(emailDigest !== undefined && { emailDigest }),
      ...(briefingInject !== undefined && { briefingInject }),
      ...(sandyNotify !== undefined && { sandyNotify }),
      ...(batchWindow !== undefined && { batchWindow }),
      ...(quietStart !== undefined && { quietStart }),
      ...(quietEnd !== undefined && { quietEnd }),
    },
  })

  return NextResponse.json(prefs, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
