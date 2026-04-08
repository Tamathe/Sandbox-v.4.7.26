import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

const toolInclude = {
  creator: true,
  _count: {
    select: {
      upvotes: true,
      favorites: true,
      comments: true,
      sessions: true,
    },
  },
} as const

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ library: [], history: [] })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ library: [], history: [] })

    const [rawEntries, sessions] = await Promise.all([
      prisma.libraryEntry.findMany({
        where: { userId: user.id },
        include: { tool: { include: toolInclude } },
        orderBy: { addedAt: 'desc' },
      }),
      prisma.toolSession.findMany({
        where: { userId: user.id },
        include: { tool: { include: toolInclude } },
        orderBy: { startedAt: 'desc' },
      }),
    ])

    const sessionStats = new Map<string, { count: number; lastSessionAt: string | null }>()
    const activeSessions = new Map<string, string>()
    const latestNotes = new Map<string, string>()
    for (const session of sessions) {
      const current = sessionStats.get(session.toolId)
      if (current) {
        current.count += 1
      } else {
        sessionStats.set(session.toolId, {
          count: 1,
          lastSessionAt: session.startedAt.toISOString(),
        })
      }

      if (!activeSessions.has(session.toolId) && session.status === 'active' && !session.endedAt) {
        activeSessions.set(session.toolId, session.id)
      }

      if (!latestNotes.has(session.toolId) && session.notes?.trim()) {
        latestNotes.set(session.toolId, session.notes.trim())
      }
    }

    const libraryToolIds = new Set(rawEntries.map((entry) => entry.toolId))
    const library = rawEntries.map((entry) => {
      const stats = sessionStats.get(entry.toolId)
      return {
        id: entry.id,
        toolId: entry.toolId,
        addedAt: entry.addedAt.toISOString(),
        sessionCount: stats?.count ?? 0,
        lastSessionAt: stats?.lastSessionAt ?? null,
        activeSessionId: activeSessions.get(entry.toolId) ?? null,
        tool: entry.tool,
      }
    })

    const historyByTool = new Map<
      string,
      {
        toolId: string
        sessionCount: number
        lastSessionAt: string | null
        activeSessionId: string | null
        latestNote: string | null
        tool: (typeof sessions)[number]['tool']
      }
    >()

    for (const session of sessions) {
      if (libraryToolIds.has(session.toolId)) continue

      const existing = historyByTool.get(session.toolId)
      if (existing) {
        existing.sessionCount += 1
      } else {
        historyByTool.set(session.toolId, {
          toolId: session.toolId,
          sessionCount: 1,
          lastSessionAt: session.startedAt.toISOString(),
          activeSessionId: activeSessions.get(session.toolId) ?? null,
          latestNote: latestNotes.get(session.toolId) ?? null,
          tool: session.tool,
        })
      }
    }

    return NextResponse.json({
      library,
      history: Array.from(historyByTool.values()),
    })
  } catch (error) {
    console.error('GET /api/library error:', error)
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ ok: false }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { toolId } = await req.json()
    if (!toolId) return NextResponse.json({ ok: false }, { status: 400 })

    await prisma.libraryEntry.upsert({
      where: { userId_toolId: { userId: user.id, toolId } },
      create: { userId: user.id, toolId },
      update: {},
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/library error:', error)
    return NextResponse.json({ error: 'Failed to update library' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ ok: false }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const toolId = req.nextUrl.searchParams.get('toolId')
    if (!toolId) return NextResponse.json({ ok: false }, { status: 400 })

    await prisma.libraryEntry.deleteMany({
      where: { userId: user.id, toolId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/library error:', error)
    return NextResponse.json({ error: 'Failed to update library' }, { status: 500 })
  }
}
