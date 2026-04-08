import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { computeScore } from '../../../../lib/bracket-teams'

// GET /api/brackets/[poolId]/entry — fetch my bracket picks
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { poolId } = await params
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [entry, games] = await Promise.all([
    prisma.bracketEntry.findUnique({ where: { poolId_userId: { poolId, userId: user.id } } }),
    prisma.bracketGame.findMany({ where: { poolId }, orderBy: { gameNumber: 'asc' } }),
  ])

  if (!entry) return NextResponse.json({ error: 'Not a member of this pool' }, { status: 404 })

  return NextResponse.json({ picks: entry.picks, score: entry.score, games })
}

// PUT /api/brackets/[poolId]/entry — save my picks
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { poolId } = await params
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const pool = await prisma.bracketPool.findUnique({ where: { id: poolId } })
  if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
  if (pool.locked) return NextResponse.json({ error: 'Bracket is locked' }, { status: 403 })

  const { picks } = await req.json() as { picks: Record<string, string> }

  const games = await prisma.bracketGame.findMany({ where: { poolId } })
  const score = computeScore(
    picks,
    games.map(g => ({ gameNumber: g.gameNumber, round: g.round, winner: g.winner }))
  )

  const entry = await prisma.bracketEntry.upsert({
    where: { poolId_userId: { poolId, userId: user.id } },
    create: { poolId, userId: user.id, picks, score },
    update: { picks, score },
  })

  return NextResponse.json({ picks: entry.picks, score: entry.score })
}
