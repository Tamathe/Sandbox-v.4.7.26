import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getRoomAssessmentAccessContext,
  isFacultyForAssessmentRoom,
  isParticipantInAssessmentRoom,
} from '../../../../lib/assessment/commons-assessment-service'
import {
  aggregateCrossExamScores,
  getStoredCrossExamResults,
  saveCrossExamSelfAssessment,
} from '../../../../lib/assessment/cross-exam-scoring-service'
import {
  isAuthFailure,
  parseRequestBody,
  requireRequestUser,
} from '../../../../lib/server-auth'

export const runtime = 'nodejs'

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
    const { roomId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitError = await checkRateLimit(req, user.id, 'API')
    if (rateLimitError) return rateLimitError

    const room = await getRoomAssessmentAccessContext(roomId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const isFaculty = isFacultyForAssessmentRoom(user, room)
    const isParticipant = isParticipantInAssessmentRoom(user.id, room)

    if (!isFaculty && !isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requestedUserId = req.nextUrl.searchParams.get('userId')
    if (!isFaculty && requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stored = await getStoredCrossExamResults(roomId)
    if (!stored) {
      return NextResponse.json(
        { error: 'Cross-exam results are not available for this room yet' },
        { status: 404 }
      )
    }

    const selectedUserId =
      requestedUserId ?? (isParticipant ? user.id : stored.participants[0]?.userId ?? null)
    if (!selectedUserId) {
      return NextResponse.json({ error: 'No participant data is available yet' }, { status: 404 })
    }

    const aggregate = await aggregateCrossExamScores(roomId, selectedUserId)

    return NextResponse.json({
      room: {
        id: room.id,
        title: room.title,
        type: room.type,
        assignmentId: room.assignmentId,
        assessmentMode: room.assessmentMode,
      },
      participants: stored.participants.map((participant) => ({
        userId: participant.userId,
        name: participant.name,
        overall: participant.ai.overall,
        peerAverage: participant.peer.average,
      })),
      ...aggregate,
      permissions: {
        isFaculty,
        isParticipant,
        canSelfAssess: isParticipant && selectedUserId === user.id,
      },
    })
  }
)

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
    const { roomId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitError = await checkRateLimit(req, user.id, 'API')
    if (rateLimitError) return rateLimitError

    const room = await getRoomAssessmentAccessContext(roomId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (!isParticipantInAssessmentRoom(user.id, room)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error

    const body = parsed.data as {
      selfScore?: unknown
      reflection?: unknown
    }

    const selfScore =
      typeof body.selfScore === 'number' && Number.isFinite(body.selfScore)
        ? body.selfScore
        : undefined
    const reflection =
      typeof body.reflection === 'string' && body.reflection.trim().length > 0
        ? body.reflection.trim()
        : undefined

    const aggregate = await saveCrossExamSelfAssessment({
      roomId,
      userId: user.id,
      payload: {
        ...(selfScore != null ? { selfScore } : {}),
        ...(reflection ? { reflection } : {}),
      },
    })

    return NextResponse.json(aggregate, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
)
