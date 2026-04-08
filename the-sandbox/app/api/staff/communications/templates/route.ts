import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getTemplates } from '../../../../lib/staff/communication-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const type = url.searchParams.get('type') || undefined
  const category = url.searchParams.get('category') || undefined

  const templates = await getTemplates({ type, category })
  return NextResponse.json(templates, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
