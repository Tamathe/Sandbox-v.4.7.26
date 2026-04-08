import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { searchCatalogCourses, getCatalogPrefixes } from '../../../lib/catalog-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const prefix = searchParams.get('prefix') ?? undefined
  const creditMin = searchParams.has('creditMin') ? Number(searchParams.get('creditMin')) : undefined
  const creditMax = searchParams.has('creditMax') ? Number(searchParams.get('creditMax')) : undefined
  const page = searchParams.has('page') ? Number(searchParams.get('page')) : undefined
  const pageSize = searchParams.has('pageSize') ? Number(searchParams.get('pageSize')) : undefined

  const [result, prefixes] = await Promise.all([
    searchCatalogCourses({ q, prefix, creditMin, creditMax, page, pageSize }),
    getCatalogPrefixes(),
  ])

  return NextResponse.json({ ...result, prefixes }, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
  })
})
