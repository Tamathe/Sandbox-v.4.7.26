import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { generateCourseMapReport, generateReportHtml } from '../../../../../lib/syllabus-architect/report-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/report?format=json|html
 *
 * Generate a comprehensive course map report with optional sections.
 * Query params:
 *   format: 'json' (default) | 'html' (print-ready)
 *   annotations: 'true' | 'false' (default: true)
 *   milestones: 'true' | 'false' (default: true)
 *   health: 'true' | 'false' (default: true)
 *   analytics: 'true' | 'false' (default: true)
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const sp = req.nextUrl.searchParams
  const format = sp.get('format') || 'json'

  const options = {
    includeAnnotations: sp.get('annotations') !== 'false',
    includeMilestones: sp.get('milestones') !== 'false',
    includeHealth: sp.get('health') !== 'false',
    includeAnalytics: sp.get('analytics') !== 'false',
  }

  const report = await generateCourseMapReport(courseId, options)

  if (format === 'html') {
    const html = generateReportHtml(report)
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
