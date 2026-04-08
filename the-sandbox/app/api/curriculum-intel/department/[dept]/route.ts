import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getDepartmentView } from '../../../../lib/curriculum-intel/curriculum-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ dept: string }> }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { dept } = await context.params
  const department = decodeURIComponent(dept)
  const view = await getDepartmentView(department)

  return NextResponse.json(view, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
