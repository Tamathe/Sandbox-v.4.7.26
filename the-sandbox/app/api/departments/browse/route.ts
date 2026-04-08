import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { listAllDepartments, getDepartmentCategoryTags, getSuggestedDepartments } from '../../../lib/department-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const category = url.searchParams.get('category') ?? undefined
  const page = parseInt(url.searchParams.get('page') ?? '1', 10)

  const [result, categoryTags, suggested] = await Promise.all([
    listAllDepartments({ category, page }),
    getDepartmentCategoryTags(),
    getSuggestedDepartments(auth.user.id, auth.user.role, auth.user.college),
  ])

  return NextResponse.json({
    departments: result.departments,
    total: result.total,
    page,
    categoryTags,
    suggested: suggested.slice(0, 4),
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
