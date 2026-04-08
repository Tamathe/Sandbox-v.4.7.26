import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../../lib/server-auth'
import { prisma } from '../../../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/webhooks/[webhookId]/deliveries
 * Paginated delivery history for a webhook (stored in metadata.webhookDeliveries).
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> },
) => {
  const { id: courseId, webhookId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { metadata: true },
  })
  if (!courseMap) {
    return NextResponse.json({ deliveries: [], total: 0 }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  }

  const meta = (courseMap.metadata && typeof courseMap.metadata === 'object' && !Array.isArray(courseMap.metadata))
    ? courseMap.metadata as Record<string, unknown>
    : {}

  interface DeliveryEntry {
    id: string
    webhookId: string
    event: string
    status: number | null
    responseTimeMs: number | null
    requestBody: unknown
    responseBody: string | null
    error: string | null
    createdAt: string
  }

  const allDeliveries = ((meta.webhookDeliveries || []) as DeliveryEntry[])
    .filter((d) => d.webhookId === webhookId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = allDeliveries.length
  const start = (page - 1) * limit
  const deliveries = allDeliveries.slice(start, start + limit)

  return NextResponse.json({ deliveries, total, page, limit }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
