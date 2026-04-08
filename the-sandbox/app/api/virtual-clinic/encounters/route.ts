import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { startEncounter } from '../../../lib/virtual-clinic/encounter-service'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const url = req.nextUrl
  const status = url.searchParams.get('status')

  const where: Record<string, unknown> = { userId: user.id }
  if (status === 'in_progress') where.completedAt = null
  if (status === 'completed') where.completedAt = { not: null }

  const encounters = await prisma.clinicalEncounter.findMany({
    where,
    include: {
      clinicalCase: {
        select: {
          id: true,
          title: true,
          chiefComplaint: true,
          difficulty: true,
          organSystems: true,
          patientName: true,
          patientAge: true,
          patientSex: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  // Lazy abandonment: mark IN_PROGRESS encounters older than 24h as ABANDONED
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const staleIds = encounters
    .filter((e) => e.status === 'IN_PROGRESS' && new Date(e.startedAt) < twentyFourHoursAgo)
    .map((e) => e.id)

  if (staleIds.length > 0) {
    await prisma.clinicalEncounter.updateMany({
      where: { id: { in: staleIds } },
      data: { status: 'ABANDONED' },
    })
    // Reflect the update in the response
    for (const enc of encounters) {
      if (staleIds.includes(enc.id)) {
        (enc as Record<string, unknown>).status = 'ABANDONED'
      }
    }
  }

  return NextResponse.json(encounters, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody<{ caseId: string; courseId?: string; isPracticeRetry?: boolean }>(req)
  if ('error' in parsed) return parsed.error

  const { caseId, courseId, isPracticeRetry } = parsed.data
  if (!caseId) return NextResponse.json({ error: 'caseId is required' }, { status: 400 })

  const encounter = await startEncounter(caseId, user.id, courseId, isPracticeRetry)
  return NextResponse.json(encounter, { status: 201 })
})
