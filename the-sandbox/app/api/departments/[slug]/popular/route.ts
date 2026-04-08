import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getDepartmentBySlug } from '../../../../lib/department-service'
import { getPopularToolsInDepartment } from '../../../../lib/hub-recommendations'

type Params = { params: Promise<{ slug: string }> }

export const GET = withErrorHandling(async (req: NextRequest, context: Params) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const tools = await getPopularToolsInDepartment(dept.id)
  return NextResponse.json({ tools }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
