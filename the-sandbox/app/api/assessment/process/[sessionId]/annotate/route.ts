import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import {
  ensureProcessTranscriptEvidence,
  getProcessAssessmentContext,
} from '../../../../../lib/assessment/process-scoring-service'
import { updateEvidence } from '../../../../../lib/assessment/evidence-service'
import { serializeProcessAnnotationPayload, type ProcessAnnotation } from '../../../../../lib/assessment/types'

export const runtime = 'nodejs'

function sanitizeAnnotations(value: unknown): ProcessAnnotation[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const rawIndex = (item as { messageIndex?: unknown }).messageIndex
      const rawText = (item as { text?: unknown }).text
      const messageIndex = Number(rawIndex)
      const text = typeof rawText === 'string' ? rawText.trim() : ''

      if (!Number.isInteger(messageIndex) || messageIndex < 0 || !text) {
        return null
      }

      return { messageIndex, text }
    })
    .filter((item): item is ProcessAnnotation => item != null)
}

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitError = await checkRateLimit(req, user.id, 'API')
    if (rateLimitError) return rateLimitError

    const context = await getProcessAssessmentContext(sessionId)
    const isOwner = context.sessionOwnerId === user.id || context.submission?.studentId === user.id

    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (context.submission?.assessmentMode !== 'PROCESS' || !context.gradebookEntry) {
      return NextResponse.json(
        {
          error:
            'Process annotations can be persisted only after a PROCESS-mode assignment submission has created linked evidence.',
        },
        { status: 409 }
      )
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error

    const body = parsed.data as {
      annotations?: unknown
      reflection?: unknown
    }

    const annotations = sanitizeAnnotations(body.annotations)
    const reflection =
      typeof body.reflection === 'string' && body.reflection.trim().length > 0
        ? body.reflection.trim()
        : undefined

    const serialized = serializeProcessAnnotationPayload({
      annotations,
      ...(reflection ? { reflection } : {}),
    })

    const ensured = await ensureProcessTranscriptEvidence(sessionId)
    const updated = await updateEvidence(ensured.evidence.id, {
      studentAnnotation: serialized,
    })

    return NextResponse.json(updated)
  }
)
