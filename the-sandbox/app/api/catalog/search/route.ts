import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { searchCatalogCourses } from '../../../lib/catalog-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 })
  }

  const prefix = searchParams.get('prefix') ?? undefined
  const creditMin = searchParams.has('creditMin') ? Number(searchParams.get('creditMin')) : undefined
  const creditMax = searchParams.has('creditMax') ? Number(searchParams.get('creditMax')) : undefined
  const page = searchParams.has('page') ? Number(searchParams.get('page')) : undefined
  const pageSize = searchParams.has('pageSize') ? Number(searchParams.get('pageSize')) : 10

  const result = await searchCatalogCourses({ q, prefix, creditMin, creditMax, page, pageSize })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
