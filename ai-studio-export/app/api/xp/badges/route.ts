import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({ where: { email } })
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const requestedUserId = req.nextUrl.searchParams.get('userId')
  const targetUserId = requestedUserId || currentUser.id

  const badges = await prisma.userBadge.findMany({
    where: { userId: targetUserId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  })

  return NextResponse.json({
    badges: badges.map((entry) => ({
      id: entry.id,
      slug: entry.badge.slug,
      name: entry.badge.name,
      icon: entry.badge.icon,
      description: entry.badge.description,
      earnedAt: entry.earnedAt,
    })),
  })
}
