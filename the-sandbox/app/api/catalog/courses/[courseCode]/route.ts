import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getCatalogCourse } from '../../../../lib/catalog-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ courseCode: string }> }) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { courseCode: rawCode } = await params
  const courseCode = decodeURIComponent(rawCode)
  const course = await getCatalogCourse(courseCode)

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json(course, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
