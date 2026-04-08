import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../lib/server-auth'
import { deleteWebhook } from '../../../../../../lib/syllabus-architect/webhook-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

/**
 * DELETE /api/courses/[id]/course-map/webhooks/[webhookId] — remove a webhook
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) => {
  const { id: courseId, webhookId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const deleted = await deleteWebhook(courseId, webhookId)
  if (!deleted) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
})
