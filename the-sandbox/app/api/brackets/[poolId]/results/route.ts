import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { computeScore } from '../../../../lib/bracket-teams'

// POST /api/brackets/[poolId]/results — creator enters a game result
// body: { gameNumber: number, winner: string }
export async function POST(
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
  if (pool.creatorId !== user.id) return NextResponse.json({ error: 'Forbidden — creator only' }, { status: 403 })

  const { gameNumber, winner } = await req.json()
  if (!gameNumber || !winner) return NextResponse.json({ error: 'gameNumber and winner required' }, { status: 400 })

  // Update the game result
  await prisma.bracketGame.update({
    where: { poolId_gameNumber: { poolId, gameNumber } },
    data: { winner, played: true },
  })

  // Recompute scores for all entries in this pool
  const [entries, allGames] = await Promise.all([
    prisma.bracketEntry.findMany({ where: { poolId } }),
    prisma.bracketGame.findMany({ where: { poolId } }),
  ])

  const gameResults = allGames.map(g => ({ gameNumber: g.gameNumber, round: g.round, winner: g.winner }))

  await Promise.all(
    entries.map(e =>
      prisma.bracketEntry.update({
        where: { id: e.id },
        data: { score: computeScore(e.picks as Record<string, string>, gameResults) },
      })
    )
  )

  // Re-rank
  const updated = await prisma.bracketEntry.findMany({
    where: { poolId },
    orderBy: { score: 'desc' },
  })

  await Promise.all(
    updated.map((e, i) =>
      prisma.bracketEntry.update({ where: { id: e.id }, data: { rank: i + 1 } })
    )
  )

  return NextResponse.json({ updated: entries.length })
}
