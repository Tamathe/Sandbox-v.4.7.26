import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { bulkScanCourse } from '../../../lib/accessibility/document-scanner'

// POST — bulk scan all materials in a course for accessibility issues
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { courseId: string }

  if (!body.courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const result = await bulkScanCourse(body.courseId)

  return NextResponse.json(result)
})
