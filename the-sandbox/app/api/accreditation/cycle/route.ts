import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const cycle = await prisma.accreditationCycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ cycle }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    cycleName: string
    cycleStartDate: string
    cycleEndDate: string
    siteVisitDate?: string
    selfStudyDue?: string
  }>(request)
  if ('error' in parsed) return parsed.error

  const { cycleName, cycleStartDate, cycleEndDate, siteVisitDate, selfStudyDue } = parsed.data

  if (!cycleName || !cycleStartDate || !cycleEndDate) {
    return NextResponse.json({ error: 'cycleName, cycleStartDate, and cycleEndDate are required' }, { status: 400 })
  }

  const standards = await prisma.accreditationStandard.count({ where: { isActive: true } })

  const cycle = await prisma.accreditationCycle.create({
    data: {
      body: 'SACSCOC',
      cycleName,
      cycleStartDate: new Date(cycleStartDate),
      cycleEndDate: new Date(cycleEndDate),
      siteVisitDate: siteVisitDate ? new Date(siteVisitDate) : null,
      selfStudyDue: selfStudyDue ? new Date(selfStudyDue) : null,
      phase: 'MAINTENANCE',
      standardsTotal: standards,
      isActive: true,
    },
  })

  return NextResponse.json({ cycle }, { status: 201 })
})
