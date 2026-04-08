import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'
import { recordIntervention } from '../../../lib/classroom-intelligence/intervention-tracker'
import type { Approach } from '../../../lib/classroom-intelligence/types'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined

  const interventions = await prisma.teachingIntervention.findMany({
    where: {
      instructorId: user.id,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(interventions, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const body = parsed.data as { courseId: string; approach: string; description: string; targetConcepts: string[] }
  const result = await recordIntervention({
    courseId: body.courseId,
    approach: body.approach as Approach,
    description: body.description,
    targetConcepts: body.targetConcepts,
    instructorId: user.id,
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
