import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const announcements = await prisma.adminAnnouncement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        message: true,
        tone: true,
        dismissible: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('GET /api/announcements error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}
