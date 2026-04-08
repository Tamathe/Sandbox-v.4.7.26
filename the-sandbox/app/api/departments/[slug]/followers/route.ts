import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getDepartmentBySlug, followDepartment, unfollowDepartment, isFollowing } from '../../../../lib/department-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const following = await isFollowing(dept.id, auth.user.id)
  return NextResponse.json({ following }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const already = await isFollowing(dept.id, auth.user.id)
  if (already) {
    return NextResponse.json({ following: true })
  }

  await followDepartment(dept.id, auth.user.id)
  return NextResponse.json({ following: true }, { status: 201 })
})

export const DELETE = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const following = await isFollowing(dept.id, auth.user.id)
  if (!following) {
    return NextResponse.json({ following: false })
  }

  await unfollowDepartment(dept.id, auth.user.id)
  return NextResponse.json({ following: false })
})
