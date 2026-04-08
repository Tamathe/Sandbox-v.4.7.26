import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireDepartmentEditor, isAuthFailure } from '../../../../lib/server-auth'
import { getDepartmentBySlug, getDepartmentAnalytics } from '../../../../lib/department-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentEditor(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const analytics = await getDepartmentAnalytics(dept.id)
  return NextResponse.json(analytics, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
