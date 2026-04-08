import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getTemplate, deleteTemplate } from '../../../lib/syllabus-architect/template-service'
import { withErrorHandling } from '../../../lib/api-utils'

/**
 * GET /api/course-map-templates/[templateId] — get template detail
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { templateId } = await params
    const template = await getTemplate(templateId)
    return NextResponse.json({ template }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

/**
 * DELETE /api/course-map-templates/[templateId] — delete template (owner or admin)
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { templateId } = await params
    await deleteTemplate(templateId, auth.user.id, auth.user.role === 'ADMIN')
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
