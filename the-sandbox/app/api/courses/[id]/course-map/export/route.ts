import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import {
  exportMapAsCSV,
  exportMapAsSVG,
  exportMapAsJson,
  generatePdfHtml,
} from '../../../../../lib/syllabus-architect/export-service'
import { exportMapAsPngData } from '../../../../../lib/course-map/export-service.server'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/export?format=csv|svg|json|pdf|png
 *
 * Export the course map in various formats.
 * Auth: requireCourseOwner for csv/svg/json/png; any authenticated user for pdf
 * (students get a personalized PDF with their study plan).
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const format = req.nextUrl.searchParams.get('format') || 'csv'

  // PDF is available to any authenticated user (students see their study plan)
  if (format === 'pdf') {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const studentId = auth.user.role === 'STUDENT' ? auth.user.id : undefined
    const html = await generatePdfHtml(courseId, { studentId })
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // All other formats require course owner / admin
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  switch (format) {
    case 'csv': {
      const csv = await exportMapAsCSV(courseId)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="course-map-${courseId}.csv"`,
        },
      })
    }

    case 'svg': {
      const svg = await exportMapAsSVG(courseId)
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="course-map-${courseId}.svg"`,
        },
      })
    }

    case 'png': {
      const pngData = await exportMapAsPngData(courseId)
      return NextResponse.json(pngData, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    case 'json': {
      const json = await exportMapAsJson(courseId)
      return new Response(JSON.stringify(json, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="course-map-${courseId}.json"`,
        },
      })
    }

    default:
      return NextResponse.json(
        { error: `Unsupported format: ${format}. Use csv, svg, json, png, or pdf.` },
        { status: 400 },
      )
  }
})
