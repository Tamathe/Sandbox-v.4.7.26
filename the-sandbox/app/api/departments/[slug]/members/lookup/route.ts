import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireDepartmentOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { getDepartmentBySlug, lookupUserByEmail } from '../../../../../lib/department-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentOwner(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email query parameter is required' }, { status: 400 })

  const user = await lookupUserByEmail(email)
  if (!user) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })

  return NextResponse.json({ user }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
