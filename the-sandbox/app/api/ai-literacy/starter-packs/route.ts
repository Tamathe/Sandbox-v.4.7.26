import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { STARTER_PACKS, adoptStarterPack, getAdoptionCounts } from '../../../lib/ai-literacy/starter-packs-service'
import type { DisciplineFamily } from '../../../generated/prisma'

// GET — list starter packs with adoption counts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const counts = await getAdoptionCounts()
  const packs = STARTER_PACKS.map(p => ({
    ...p,
    adoptionCount: counts[p.disciplineFamily] ?? 0,
  }))

  return NextResponse.json({ packs }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST — adopt a starter pack for a course
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { courseId: string; disciplineFamily: DisciplineFamily }
  const { courseId, disciplineFamily } = body

  if (!courseId || !disciplineFamily) {
    return NextResponse.json({ error: 'Missing courseId or disciplineFamily' }, { status: 400 })
  }

  const validFamilies: DisciplineFamily[] = ['STEM', 'HUMANITIES', 'SOCIAL_SCIENCES', 'ARTS', 'PROFESSIONAL', 'HEALTH_SCIENCES']
  if (!validFamilies.includes(disciplineFamily)) {
    return NextResponse.json({ error: 'Invalid discipline family' }, { status: 400 })
  }

  const result = await adoptStarterPack(auth.user.id, courseId, disciplineFamily)
  return NextResponse.json(result, { status: 201 })
})
