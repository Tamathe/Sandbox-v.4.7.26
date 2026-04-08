import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '../../../lib/prisma'

export async function GET(req: NextRequest) {
  const userEmail = req.headers.get('x-demo-user-email')
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const days = Math.max(14, Number.parseInt(req.nextUrl.searchParams.get('days') || '14', 10) || 14)
  const now = Date.now()
  const twoWeeksAgo = new Date(now - days * 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now - (days / 2) * 24 * 60 * 60 * 1000)

  const [lastWeek, thisWeek] = await Promise.all([
    prisma.xPEvent.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
      _sum: { amount: true },
    }),
    prisma.xPEvent.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: oneWeekAgo },
      },
      _sum: { amount: true },
    }),
  ])

  return NextResponse.json({
    thisWeek: thisWeek._sum.amount || 0,
    lastWeek: lastWeek._sum.amount || 0,
  })
}
