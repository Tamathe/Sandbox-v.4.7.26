import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../lib/api-utils'
import { requireRequestUser, requireAdminUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { listDepartments, createDepartment } from '../../lib/department-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const featured = url.searchParams.get('featured')
  const page = parseInt(url.searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)

  const result = await listDepartments({
    featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
    page,
    pageSize,
  })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { name, shortName, slug, description, logoUrl, bannerUrl, themeColor, websiteUrl, contactEmail, visibility, featured, displayOrder } = parsed.data as { name: string; shortName: string; slug: string; description?: string; logoUrl?: string; bannerUrl?: string; themeColor?: string; websiteUrl?: string; contactEmail?: string; visibility?: 'PUBLIC' | 'INTERNAL' | 'ROLE_RESTRICTED'; featured?: boolean; displayOrder?: number }

  if (!name || !shortName || !slug) {
    return NextResponse.json({ error: 'name, shortName, and slug are required' }, { status: 400 })
  }

  const department = await createDepartment(
    { name, shortName, slug, description, logoUrl, bannerUrl, themeColor, websiteUrl, contactEmail, visibility, featured, displayOrder },
    auth.user.id,
  )
  return NextResponse.json(department, { status: 201 })
})
