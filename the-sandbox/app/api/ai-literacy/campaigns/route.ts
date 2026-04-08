import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { createCampaign, getActiveCampaignsForUser, getDepartmentCampaigns } from '../../../lib/ai-literacy/campaign-service'

// GET — active campaigns for the current user
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const departmentId = req.nextUrl.searchParams.get('departmentId')

  if (departmentId) {
    const campaigns = await getDepartmentCampaigns(departmentId)
    return NextResponse.json({ campaigns }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const campaigns = await getActiveCampaignsForUser(auth.user.id)
  return NextResponse.json({ campaigns }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST — create a campaign (ADMIN or educator with department role)
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { departmentId: string; title: string; targetCoverage: number; deadline: string }
  const { departmentId, title, targetCoverage, deadline } = body

  if (!departmentId || !title || targetCoverage == null || !deadline) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const campaign = await createCampaign(
    departmentId,
    title,
    targetCoverage,
    new Date(deadline),
    auth.user.id,
  )

  return NextResponse.json(campaign, { status: 201 })
})
