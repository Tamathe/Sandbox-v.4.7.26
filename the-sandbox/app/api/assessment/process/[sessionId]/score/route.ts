import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import {
  ensureProcessTranscriptEvidence,
  getProcessAssessmentContext,
  scoreAndPersistProcess,
} from '../../../../../lib/assessment/process-scoring-service'

export const runtime = 'nodejs'

function isFacultyForSubmission(
  user: { id: string; role: string },
  submission: { instructorId: string } | null
) {
  return user.role === 'ADMIN' || (user.role === 'EDUCATOR' && submission?.instructorId === user.id)
}

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitError = await checkRateLimit(req, user.id, 'API')
    if (rateLimitError) return rateLimitError

    const context = await getProcessAssessmentContext(sessionId)
    const isFaculty = isFacultyForSubmission(user, context.submission)

    if (!isFaculty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (context.submission?.assessmentMode !== 'PROCESS' || !context.gradebookEntry) {
      return NextResponse.json(
        { error: 'Session is not linked to a PROCESS-mode assignment submission' },
        { status: 400 }
      )
    }

    const ensured = await ensureProcessTranscriptEvidence(sessionId)
    const scored = await scoreAndPersistProcess(ensured.evidence.id, sessionId)

    return NextResponse.json(scored)
  }
)
