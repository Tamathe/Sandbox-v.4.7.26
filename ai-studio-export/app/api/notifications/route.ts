import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20)
    )

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: auth.user.id, readAt: null },
      }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ error: 'Failed to load notifications.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response

    const body = (await request.json().catch(() => ({}))) as {
      id?: string
      markAll?: boolean
    }

    if (body.markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: auth.user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (!body.id) {
      return NextResponse.json({ error: 'Notification id is required.' }, { status: 400 })
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: body.id,
        userId: auth.user.id,
      },
      select: { id: true },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
    }

    const updated = await prisma.notification.update({
      where: { id: body.id },
      data: { readAt: new Date() },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/notifications error:', error)
    return NextResponse.json({ error: 'Failed to update notification.' }, { status: 500 })
  }
}
