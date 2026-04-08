import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/brackets/[poolId] — pool details, leaderboard, games
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { poolId } = await params

  const [user, pool] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.bracketPool.findUnique({
      where: { id: poolId },
      include: {
        creator: { select: { id: true, name: true } },
        games: { orderBy: { gameNumber: 'asc' } },
        entries: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { score: 'desc' },
        },
        emailSubs: true,
      },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })

  // Rank entries
  const ranked = pool.entries.map((e, i) => ({
    userId: e.userId,
    name: e.user.name,
    score: e.score,
    rank: i + 1,
    isYou: e.userId === user.id,
    entryId: e.id,
  }))

  const myEntry = pool.entries.find(e => e.userId === user.id)
  const isCreator = pool.creatorId === user.id

  return NextResponse.json({
    pool: {
      id: pool.id,
      name: pool.name,
      joinCode: isCreator ? pool.joinCode : undefined,
      locked: pool.locked,
      lockedAt: pool.lockedAt,
      scoringType: pool.scoringType,
      year: pool.year,
      creatorId: pool.creatorId,
      creatorName: pool.creator.name,
    },
    games: pool.games,
    leaderboard: ranked,
    myEntry: myEntry ? { id: myEntry.id, score: myEntry.score, picks: myEntry.picks } : null,
    isCreator,
    isMember: !!myEntry,
    isSubscribedToEmail: pool.emailSubs.some(s => s.userId === user.id && s.active),
  })
}

// PATCH /api/brackets/[poolId] — lock pool (creator only) or toggle email sub
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { poolId } = await params
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { action, emailForDigest } = await req.json()

  if (action === 'lock') {
    const pool = await prisma.bracketPool.findUnique({ where: { id: poolId } })
    if (!pool || pool.creatorId !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.bracketPool.update({
      where: { id: poolId },
      data: { locked: true, lockedAt: new Date() },
    })
    return NextResponse.json({ locked: true })
  }

  if (action === 'subscribe' && emailForDigest) {
    await prisma.bracketEmailSub.upsert({
      where: { poolId_userId: { poolId, userId: user.id } },
      create: { poolId, userId: user.id, email: emailForDigest },
      update: { email: emailForDigest, active: true },
    })
    return NextResponse.json({ subscribed: true })
  }

  if (action === 'unsubscribe') {
    await prisma.bracketEmailSub.updateMany({
      where: { poolId, userId: user.id },
      data: { active: false },
    })
    return NextResponse.json({ subscribed: false })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
