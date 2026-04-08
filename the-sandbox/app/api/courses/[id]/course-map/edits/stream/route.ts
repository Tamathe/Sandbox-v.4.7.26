import { NextRequest } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import {
  joinEditor,
  leaveEditor,
  heartbeatEditor,
  getActiveEditors,
  subscribeToEdits,
} from '../../../../../../lib/syllabus-architect/collab-editing'
import { prisma } from '../../../../../../lib/prisma'

/**
 * GET /api/courses/[id]/course-map/edits/stream
 *
 * SSE stream for real-time collaborative map editing events.
 * Auth: requireCourseOwner (EDUCATOR/ADMIN only).
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  // Find course map ID
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) {
    return new Response(JSON.stringify({ error: 'Course map not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const courseMapId = courseMap.id
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Register editor
      const editor = {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      }
      joinEditor(courseMapId, editor)

      // Send initial editors snapshot
      const editors = getActiveEditors(courseMapId)
      const initEvent = JSON.stringify({ type: 'editors_snapshot', payload: { editors } })
      controller.enqueue(encoder.encode(`data: ${initEvent}\n\n`))

      // Heartbeat interval (every 15s)
      const heartbeatInterval = setInterval(() => {
        heartbeatEditor(courseMapId, user.id)
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          // Stream closed
          clearInterval(heartbeatInterval)
        }
      }, 15_000)

      // Subscribe to edit events
      const unsubscribe = subscribeToEdits(courseMapId, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Stream closed
        }
      })

      // Handle client disconnect via AbortSignal
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        unsubscribe()
        leaveEditor(courseMapId, user.id)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})
