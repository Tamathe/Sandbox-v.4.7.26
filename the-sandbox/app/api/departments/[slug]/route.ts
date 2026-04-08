import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, requireDepartmentOwner, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { getDepartment, getDepartmentBySlug, updateDepartment } from '../../../lib/department-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug } = await context.params
  const department = await getDepartment(slug)
  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }
  return NextResponse.json(department, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  const auth = await requireDepartmentOwner(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const updated = await updateDepartment(dept.id, parsed.data as {
    name?: string; shortName?: string; slug?: string; description?: string | null; logoUrl?: string | null; bannerUrl?: string | null; themeColor?: string | null; websiteUrl?: string | null; contactEmail?: string | null; visibility?: 'PUBLIC' | 'INTERNAL' | 'ROLE_RESTRICTED'; featured?: boolean; displayOrder?: number
  })
  return NextResponse.json(updated)
})
