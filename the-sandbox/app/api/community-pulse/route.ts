import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { prisma } from '../../lib/prisma'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1. Active Live Rooms right now
  const activeRooms = await prisma.liveRoom.findMany({
    where: { phase: { not: 'COMPLETE' } },
    include: {
      host: { select: { name: true } },
      participants: {
        select: { user: { select: { id: true, name: true } } },
      },
      channel: {
        select: { group: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // 2. Recently completed rooms (last 24h)
  const recentRooms = await prisma.liveRoom.findMany({
    where: { phase: 'COMPLETE', endedAt: { gte: oneDayAgo } },
    include: {
      host: { select: { name: true } },
      participants: {
        select: { user: { select: { id: true, name: true } }, score: true },
        orderBy: { score: 'desc' },
        take: 3,
      },
    },
    orderBy: { endedAt: 'desc' },
    take: 5,
  })

  // 3. Active studiers — people in active study rooms
  const studyRoomCount = activeRooms.filter((r) => r.type === 'STUDY').length
  const studyParticipantCount = activeRooms
    .filter((r) => r.type === 'STUDY')
    .reduce((sum, r) => sum + r.participants.length, 0)

  // 4. Challenge stats (last 24h)
  const challengeCount = await prisma.liveRoom.count({
    where: { type: 'CHALLENGE', createdAt: { gte: oneDayAgo } },
  })
  const totalParticipants = await prisma.liveRoomParticipant.count({
    where: { room: { createdAt: { gte: oneDayAgo } } },
  })

  // 5. Trending topics — most common Live Room titles/topics in last 24h
  const recentAllRooms = await prisma.liveRoom.findMany({
    where: { createdAt: { gte: oneDayAgo } },
    select: { title: true, config: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const topicCounts = new Map<string, number>()
  for (const r of recentAllRooms) {
    const topic = (r.config as Record<string, unknown>)?.topic as string ?? r.title
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
  }
  const trending = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }))

  // 6. Your people — friends/groupmates who are currently active
  const userGroups = await prisma.chatMembership.findMany({
    where: { userId: auth.user.id },
    select: { groupId: true },
  })
  const groupIds = userGroups.map((g) => g.groupId)

  const activePeople = activeRooms
    .filter((r) => {
      const groupId = r.channel?.group ? undefined : undefined // Check if in user's groups
      return true // Show all for now
    })
    .flatMap((r) => r.participants.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      roomTitle: r.title,
      roomType: r.type,
    })))
    .filter((p) => p.userId !== auth.user.id)
    .slice(0, 10)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thesandbox.uky.edu'

  return NextResponse.json({
    activeRooms: activeRooms.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      phase: r.phase,
      hostName: r.host.name,
      groupName: r.channel?.group?.name ?? 'Unknown',
      participantCount: r.participants.length,
      participants: r.participants.slice(0, 5).map((p) => p.user.name),
      shareUrl: `${baseUrl}/join-room/${r.id}`,
    })),
    recentRooms: recentRooms.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      hostName: r.host.name,
      topPlayers: r.participants.map((p) => ({ name: p.user.name, score: p.score })),
    })),
    stats: {
      activeStudyRooms: studyRoomCount,
      activeStudiers: studyParticipantCount,
      challengesToday: challengeCount,
      participantsToday: totalParticipants,
    },
    trending,
    activePeople,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
