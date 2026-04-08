import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getRoomAssessmentAccessContext,
  isFacultyForAssessmentRoom,
  isParticipantInAssessmentRoom,
} from '../../../../lib/assessment/commons-assessment-service'
import { getDivergenceAssessmentRecord } from '../../../../lib/assessment/divergence-service'
import {
  isAuthFailure,
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

    const record = await getDivergenceAssessmentRecord(roomId)
    const selectedUserId =
      requestedUserId ??
      (isParticipant ? user.id : record.participants[0]?.userId ?? null)

    if (!selectedUserId) {
      return NextResponse.json(
        { error: 'No divergence participant data is available yet' },
        { status: 404 }
      )
    }

    const selectedParticipant = record.participants.find(
      (participant) => participant.userId === selectedUserId
    )

    if (!selectedParticipant) {
      return NextResponse.json(
        { error: 'Participant was not found in this divergence assessment' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      room: {
        id: room.id,
        title: room.title,
        type: room.type,
        assignmentId: room.assignmentId,
        assessmentMode: room.assessmentMode,
      },
      scenario: record.scenario,
      tree: record.tree,
      clusterCount: record.clusterCount,
      keyDecisionPoints: record.keyDecisionPoints,
      participants: record.participants.map((participant) => ({
        userId: participant.userId,
        name: participant.name,
        coherenceScore: participant.coherenceScore,
      })),
      selectedParticipant,
      permissions: {
        isFaculty,
        isParticipant,
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
)
