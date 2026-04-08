import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { buildInitialGames } from '../../lib/bracket-teams'

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// GET /api/brackets — list pools the current user created or joined
export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const entries = await prisma.bracketEntry.findMany({
    where: { userId: user.id },
    include: {
      pool: {
        include: {
          creator: { select: { name: true } },
          entries: { select: { id: true, score: true, userId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const pools = entries.map(e => ({
    pool: e.pool,
    myEntry: { id: e.id, score: e.score, rank: e.rank },
    memberCount: e.pool.entries.length,
  }))

  return NextResponse.json({ pools })
}

// POST /api/brackets — create a new pool
export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { name, scoringType = 'standard', emailForDigest } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  let joinCode = randomCode()
  // ensure unique
  while (await prisma.bracketPool.findUnique({ where: { joinCode } })) {
    joinCode = randomCode()
  }

  const initialGames = buildInitialGames()

  const pool = await prisma.bracketPool.create({
    data: {
      name: name.trim(),
      joinCode,
      creatorId: user.id,
      scoringType,
      games: {
        create: initialGames.map(g => ({
          gameNumber: g.gameNumber,
          round: g.round,
          team1: g.team1,
          team2: g.team2,
        })),
      },
      // Auto-enroll creator
      entries: {
        create: { userId: user.id },
      },
      // Auto-subscribe creator to emails if provided
      ...(emailForDigest
        ? {
            emailSubs: {
              create: { userId: user.id, email: emailForDigest },
            },
          }
        : {}),
    },
    include: { games: true },
  })

  return NextResponse.json({ pool, joinCode }, { status: 201 })
}
