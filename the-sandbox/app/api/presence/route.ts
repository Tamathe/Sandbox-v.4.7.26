import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '../../lib/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const { lastPath } = await req.json()

    await prisma.user.update({
      where: { email: userEmail },
      data: {
        lastPath: lastPath ?? null,
        lastSeenAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/presence error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const activeUsers = await prisma.user.findMany({
      where: {
        email: { not: userEmail },
        lastSeenAt: { gte: fiveMinutesAgo },
      },
      select: {
        email: true,
        name: true,
        lastPath: true,
        lastSeenAt: true,
      },
    })

    return NextResponse.json({ users: activeUsers })
  } catch (error) {
    console.error('GET /api/presence error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
