import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    const sessionId = req.nextUrl.searchParams.get('id')

    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const session = await prisma.buildSession.findUnique({
      where: { id: sessionId },
      include: {
        documents: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            filename: true,
            wordCount: true,
            sessionId: true,
            createdAt: true,
          },
        },
      },
    })

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.creatorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      sessionId: session.id,
      title: session.title,
      status: session.status,
      toolSpec: session.toolSpec,
      documents: session.documents,
    })
  } catch (err) {
    console.error('GET /api/builder/sessions error:', err)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const session = await prisma.buildSession.create({
      data: { creatorId: user.id },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    console.error('POST /api/builder/sessions error:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
