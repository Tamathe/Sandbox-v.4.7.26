import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

function anonymizeName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'Anonymous'
  if (parts.length === 1) return parts[0]!
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = req.nextUrl.searchParams.get('courseId')
    const metric = req.nextUrl.searchParams.get('metric') || 'score'
    const limit = Math.min(25, Math.max(1, Number.parseInt(req.nextUrl.searchParams.get('limit') || '10', 10) || 10))
    const userEmail = req.headers.get('x-demo-user-email')

    let currentUserId: string | null = null
    if (userEmail) {
      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      currentUserId = user?.id ?? null
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where: {
        toolId: id,
        metricKey: metric,
        ...(courseId ? { courseId } : {}),
      },
      orderBy: [{ score: 'desc' }, { achievedAt: 'asc' }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      entries.map((entry, index) => ({
        id: entry.id,
        rank: index + 1,
        userId: entry.userId,
        displayName: anonymizeName(entry.user.name),
        score: entry.score,
        achievedAt: entry.achievedAt,
        isCurrentUser: currentUserId === entry.userId,
      }))
    )
  } catch (error) {
    console.error('GET /api/tools/[id]/leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
