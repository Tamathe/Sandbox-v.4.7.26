import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getRoomAssessmentAccessContext,
  isFacultyForAssessmentRoom,
  isParticipantInAssessmentRoom,
} from '../../../../lib/assessment/commons-assessment-service'
import { getStoredTeachbackAssessmentResults } from '../../../../lib/assessment/teachback-assessment-service'
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

    const results = await getStoredTeachbackAssessmentResults(roomId)
    const selectedUserId =
      requestedUserId ?? (isParticipant ? user.id : results[0]?.userId ?? null)

    const selectedParticipant =
      selectedUserId != null
        ? results.find((result) => result.userId === selectedUserId) ?? null
        : null

    return NextResponse.json({
      room: {
        id: room.id,
        title: room.title,
        type: room.type,
        assignmentId: room.assignmentId,
        assessmentMode: room.assessmentMode,
      },
      participants: results.map((result) => ({
        userId: result.userId,
        name: result.name,
        concept: result.concept,
        composite: result.composite,
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
