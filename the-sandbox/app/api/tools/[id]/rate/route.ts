import { NextRequest, NextResponse } from 'next/server'

import { getPrismaClient } from '../../../../lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = req.headers.get('x-demo-user-email')
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { rating } = await req.json()

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  }

  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await prisma.toolRating.upsert({
    where: { userId_toolId: { userId: user.id, toolId: id } },
    update: { rating },
    create: { userId: user.id, toolId: id, rating },
  })

  const aggregate = await prisma.toolRating.aggregate({
    where: { toolId: id },
    _avg: { rating: true },
    _count: { rating: true },
  })

  return NextResponse.json({
    avg: Math.round((aggregate._avg.rating || 0) * 10) / 10,
    count: aggregate._count.rating,
    userRating: rating,
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = req.headers.get('x-demo-user-email')
  const { id } = await params
  const prisma = getPrismaClient()

  const aggregate = await prisma.toolRating.aggregate({
    where: { toolId: id },
    _avg: { rating: true },
    _count: { rating: true },
  })

  let userRating: number | null = null
  if (userEmail) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (user) {
      const existing = await prisma.toolRating.findUnique({
        where: { userId_toolId: { userId: user.id, toolId: id } },
      })
      userRating = existing?.rating ?? null
    }
  }

  return NextResponse.json({
    avg: Math.round((aggregate._avg.rating || 0) * 10) / 10,
    count: aggregate._count.rating,
    userRating,
  })
}
