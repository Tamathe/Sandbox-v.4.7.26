import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { suggestTemplate } from '../../../../../lib/syllabus-architect/course-map-templates'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * POST /api/courses/[id]/course-map/suggest-template
 * Body: { syllabusText: string }
 *
 * AI analyzes syllabus text and recommends the best-fit course map templates.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { syllabusText?: string }

  if (!body.syllabusText || typeof body.syllabusText !== 'string' || body.syllabusText.trim().length < 50) {
    return NextResponse.json(
      { error: 'syllabusText is required (minimum 50 characters)' },
      { status: 400 },
    )
  }

  const suggestions = await suggestTemplate(body.syllabusText)
  return NextResponse.json({ suggestions, courseId })
})
