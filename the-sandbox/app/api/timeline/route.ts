import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../lib/server-auth'
import { getTimeline, type TimelineEventType, type TimelineOptions } from '../../lib/timeline-service'
import { withErrorHandling } from '../../lib/api-utils'

const VALID_TYPES = new Set<TimelineEventType>([
  'session',
  'mastery_jump',
  'transfer',
  'misconception_cleared',
  'bloom_advance',
  'study_plan',
])

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const params = req.nextUrl.searchParams
    const courseId = params.get('courseId') ?? undefined
    const fromStr = params.get('from')
    const toStr = params.get('to')
    const limitStr = params.get('limit')
    const offsetStr = params.get('offset')
    const typesStr = params.get('types')

    const options: TimelineOptions = { courseId }

    if (fromStr) {
      const d = new Date(fromStr)
      if (!isNaN(d.getTime())) options.from = d
    }
    if (toStr) {
      const d = new Date(toStr)
      if (!isNaN(d.getTime())) options.to = d
    }

    options.limit = limitStr ? Math.max(1, Math.min(200, parseInt(limitStr, 10) || 50)) : 50
    options.offset = offsetStr ? Math.max(0, parseInt(offsetStr, 10) || 0) : 0

    if (typesStr) {
      const parsed = typesStr.split(',').filter((t): t is TimelineEventType => VALID_TYPES.has(t as TimelineEventType))
      if (parsed.length > 0) options.types = parsed
    }

    const result = await getTimeline(user.id, options)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
