import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { startLiveRoom } from '../../../../lib/commons/commons-service'
import { startStudySession } from '../../../../lib/commons/study-engine'
import { startWatchParty } from '../../../../lib/commons/watch-engine'
import { startTeachBack } from '../../../../lib/commons/teachback-engine'
import { startSimulation } from '../../../../lib/commons/simulation-engine'
import { startDebate } from '../../../../lib/commons/debate-engine'
import { startProblemLab } from '../../../../lib/commons/problem-lab-engine'
import { startSpeedMentoring } from '../../../../lib/commons/speed-mentoring-engine'
import { startPeerReview } from '../../../../lib/commons/peer-review-engine'
import { startOfficeHours } from '../../../../lib/commons/office-hours-engine'
import { startCaseStudy } from '../../../../lib/commons/case-study-engine'
import { startImprov } from '../../../../lib/commons/improv-engine'
import { startFishbowl } from '../../../../lib/commons/fishbowl-engine'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  try {
    const room = await prisma.liveRoom.findUnique({ where: { id: roomId }, select: { type: true } })
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    switch (room.type) {
      case 'STUDY':
        await startStudySession(roomId, auth.user.id)
        break
      case 'WATCH':
        await startWatchParty(roomId, auth.user.id)
        break
      case 'TEACHBACK':
        await startTeachBack(roomId, auth.user.id)
        break
      case 'SIMULATION':
        await startSimulation(roomId, auth.user.id)
        break
      case 'DEBATE':
        await startDebate(roomId, auth.user.id)
        break
      case 'PROBLEM_LAB':
        await startProblemLab(roomId, auth.user.id)
        break
      case 'SPEED_MENTORING':
        await startSpeedMentoring(roomId, auth.user.id)
        break
      case 'PEER_REVIEW':
        await startPeerReview(roomId, auth.user.id)
        break
      case 'OFFICE_HOURS':
        await startOfficeHours(roomId, auth.user.id)
        break
      case 'CASE_STUDY':
        await startCaseStudy(roomId, auth.user.id)
        break
      case 'IMPROV':
        await startImprov(roomId, auth.user.id)
        break
      case 'FISHBOWL':
        await startFishbowl(roomId, auth.user.id)
        break
      default:
        await startLiveRoom(roomId, auth.user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const e = err as { message: string; status?: number }
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
})
