import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { buildPersonalizedPackStreaming, type BuilderEvent } from '../../../../lib/ai-literacy/pack-builder-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) {
    return auth.response
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { courseId: string; courseDescription: string; classSize?: number; courseType?: string; comfortLevel?: string; concerns?: string; existingAssignmentTypes?: string[] }
  const { courseId, courseDescription, classSize, courseType, comfortLevel, concerns, existingAssignmentTypes } = body

  if (!courseId || !courseDescription) {
    return new Response(JSON.stringify({ error: 'courseId and courseDescription are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: BuilderEvent) => {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      try {
        await buildPersonalizedPackStreaming(
          {
            userId: auth.user.id,
            courseId,
            courseDescription,
            classSize,
            courseType,
            comfortLevel,
            concerns,
            existingAssignmentTypes,
          },
          emit,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        const data = `event: error\ndata: ${JSON.stringify({ type: 'error', message })}\n\n`
        controller.enqueue(encoder.encode(data))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
