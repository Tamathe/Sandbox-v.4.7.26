import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

// GET — returns compliance audit log entries grouped by day and action for the last 30 days
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const logs = await prisma.complianceAuditLog.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      action: { in: ['accept-tos', 'accept-consent', 'accept-ferpa'] },
    },
    select: {
      action: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Build day-by-day trend data
  const dayMap = new Map<string, { date: string; tos: number; consent: number; ferpa: number }>()

  // Pre-fill last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, { date: key, tos: 0, consent: 0, ferpa: 0 })
  }

  for (const log of logs) {
    const key = log.createdAt.toISOString().slice(0, 10)
    const entry = dayMap.get(key)
    if (!entry) continue
    if (log.action === 'accept-tos') entry.tos++
    else if (log.action === 'accept-consent') entry.consent++
    else if (log.action === 'accept-ferpa') entry.ferpa++
  }

  const trends = Array.from(dayMap.values())

  // Also return CSV data: all users with compliance columns
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
      tosAcceptedAt: true,
      dataConsentAt: true,
      ferpaAckAt: true,
      acceptedTosVersion: true,
      acceptedConsentVersion: true,
      acceptedFerpaVersion: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ trends, users }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
