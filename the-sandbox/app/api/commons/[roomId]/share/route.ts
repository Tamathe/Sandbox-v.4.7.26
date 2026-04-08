import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { select: { user: { select: { name: true } } } },
    },
  })

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thesandbox.uky.edu'
  const shareUrl = `${baseUrl}/join-room/${roomId}`

  const typeLabel: Record<string, string> = {
    CHALLENGE: 'Quiz Battle',
    STUDY: 'Study Session',
    WATCH: 'Watch Party',
    TEACHBACK: 'Teach-Back Circle',
    SIMULATION: 'Simulation',
    DEBATE: 'Debate',
    PROBLEM_LAB: 'Problem Lab',
    SPEED_MENTORING: 'Speed Mentoring',
    PEER_REVIEW: 'Peer Review',
    OFFICE_HOURS: 'Office Hours',
    CASE_STUDY: 'Case Study',
    IMPROV: 'Improv',
    FISHBOWL: 'Fishbowl',
  }

  const count = room.participants.length
  const description = `Join ${count} ${count === 1 ? 'person' : 'people'} in a ${typeLabel[room.type] ?? 'Live Room'}${room.title ? `: ${room.title}` : ''}`

  return NextResponse.json({
    url: shareUrl,
    title: room.title || `${typeLabel[room.type] ?? 'Live'} Room`,
    description,
    participantCount: count,
    type: room.type,
    phase: room.phase,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
