import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { listWebhooks, registerWebhook, testWebhook } from '../../../../../lib/syllabus-architect/webhook-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/webhooks — list configured webhooks
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const webhooks = await listWebhooks(courseId)
  return NextResponse.json({ webhooks }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

/**
 * POST /api/courses/[id]/course-map/webhooks — register a new webhook or test an existing one
 * Body for register: { url: string, secret: string, events: string[] }
 * Body for test: { action: 'test', webhookId: string }
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { action?: string; webhookId?: string; url?: string; secret?: string; events?: string[] }

  // Test an existing webhook
  if (body.action === 'test' && body.webhookId) {
    const result = await testWebhook(courseId, body.webhookId)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  }

  // Register a new webhook
  const { url, secret, events } = body
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  if (!secret || typeof secret !== 'string') {
    return NextResponse.json({ error: 'secret is required' }, { status: 400 })
  }

  const webhook = await registerWebhook(
    courseId,
    url,
    secret,
    Array.isArray(events) ? events : [],
  )

  return NextResponse.json({ webhook: { ...webhook, secret: '••••••••' } }, { status: 201 })
})
