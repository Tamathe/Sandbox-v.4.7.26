import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  ARCHITECTURE_REPORT_FORMATS,
  ARCHITECTURE_REPORT_VIEWS,
  buildArchitectureReport,
  renderArchitectureReportMarkdown,
  type ArchitectureReportFormat,
  type ArchitectureReportView,
  selectArchitectureReportView,
} from '../../../lib/architecture-report'
import { isAuthFailure, requireAdminUser } from '../../../lib/server-auth'

function isArchitectureView(value: string | null): value is ArchitectureReportView {
  return value != null && ARCHITECTURE_REPORT_VIEWS.includes(value as ArchitectureReportView)
}

function isArchitectureFormat(value: string | null): value is ArchitectureReportFormat {
  return value != null && ARCHITECTURE_REPORT_FORMATS.includes(value as ArchitectureReportFormat)
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(request.url)
  const requestedView = searchParams.get('view')
  const requestedFormat = searchParams.get('format')

  if (requestedView && !isArchitectureView(requestedView)) {
    return NextResponse.json(
      {
        error: `view must be one of: ${ARCHITECTURE_REPORT_VIEWS.join(', ')}`,
      },
      { status: 400 },
    )
  }

  if (requestedFormat && !isArchitectureFormat(requestedFormat)) {
    return NextResponse.json(
      {
        error: `format must be one of: ${ARCHITECTURE_REPORT_FORMATS.join(', ')}`,
      },
      { status: 400 },
    )
  }

  const view = (requestedView ?? 'summary') as ArchitectureReportView
  const format = (requestedFormat ?? 'json') as ArchitectureReportFormat
  const report = await buildArchitectureReport()

  if (format === 'markdown') {
    const markdown = renderArchitectureReportMarkdown(report, view)
    const timestamp = report.generatedAt.slice(0, 10)
    const filename =
      view === 'legal'
        ? `system-interdependencies-${timestamp}.md`
        : `system-interdependencies-summary-${timestamp}.md`

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json(selectArchitectureReportView(report, view), {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
