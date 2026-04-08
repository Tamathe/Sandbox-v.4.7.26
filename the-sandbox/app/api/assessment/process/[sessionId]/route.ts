import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../lib/rate-limit'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getProcessAssessmentContext } from '../../../../lib/assessment/process-scoring-service'

export const runtime = 'nodejs'

function isFacultyForSubmission(
  user: { id: string; role: string },
  submission: { instructorId: string } | null
) {
  return user.role === 'ADMIN' || (user.role === 'EDUCATOR' && submission?.instructorId === user.id)
}

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitError = await checkRateLimit(req, user.id, 'API')
    if (rateLimitError) return rateLimitError

    const context = await getProcessAssessmentContext(sessionId)
    const isOwner = context.sessionOwnerId === user.id || context.submission?.studentId === user.id
    const isFaculty = isFacultyForSubmission(user, context.submission)

    if (!isOwner && !isFaculty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      sessionId: context.sessionId,
      messages: context.transcript.messages,
      annotations: context.transcript.annotations,
      reflection: context.transcript.reflection,
      sessionMeta: context.transcript.sessionMeta,
      evidence: context.evidence,
      gradebookEntry: context.gradebookEntry,
      submission: context.submission
        ? {
            id: context.submission.id,
            assignmentId: context.submission.assignmentId,
            assignmentTitle: context.submission.assignmentTitle,
            assessmentMode: context.submission.assessmentMode,
            assignmentType: context.submission.assignmentType,
          }
        : null,
      permissions: {
        isOwner,
        isFaculty,
        canAnnotate:
          isOwner &&
          context.submission?.assessmentMode === 'PROCESS' &&
          Boolean(context.gradebookEntry),
        canScore:
          isFaculty &&
          context.submission?.assessmentMode === 'PROCESS' &&
          Boolean(context.gradebookEntry),
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
)
