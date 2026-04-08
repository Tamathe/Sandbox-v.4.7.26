import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { submitCampusTip, getUserCampusTips, getTipsForBuilding } from '../../../lib/contribute/contribute-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const buildingId = req.nextUrl.searchParams.get('buildingId')
  if (buildingId) {
    const tips = await getTipsForBuilding(buildingId)
    return NextResponse.json(tips, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const tips = await getUserCampusTips(auth.user.id)
  return NextResponse.json(tips, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { buildingId, tipType, content } = parsed.data as {
    buildingId: string; tipType: string; content: string
  }

  if (!buildingId || !tipType || !content?.trim()) {
    return NextResponse.json({ error: 'buildingId, tipType, and content are required' }, { status: 400 })
  }

  const tip = await submitCampusTip(auth.user.id, {
    buildingId,
    tipType: tipType as 'STUDY_SPOT' | 'FOOD_TIP' | 'PARKING' | 'ACCESSIBILITY' | 'GENERAL',
    content: content.trim(),
  })
  return NextResponse.json(tip, { status: 201 })
})
