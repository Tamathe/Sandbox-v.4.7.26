import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// POST /api/brackets/join — join a pool by join code
export async function POST(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { joinCode, emailForDigest } = await req.json()
  if (!joinCode?.trim()) return NextResponse.json({ error: 'Join code required' }, { status: 400 })

  const pool = await prisma.bracketPool.findUnique({
    where: { joinCode: joinCode.toUpperCase().trim() },
  })
  if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })

  const existing = await prisma.bracketEntry.findUnique({
    where: { poolId_userId: { poolId: pool.id, userId: user.id } },
  })
  if (existing) return NextResponse.json({ error: 'Already in this pool', poolId: pool.id }, { status: 409 })

  await prisma.bracketEntry.create({ data: { poolId: pool.id, userId: user.id } })

  if (emailForDigest) {
    await prisma.bracketEmailSub.upsert({
      where: { poolId_userId: { poolId: pool.id, userId: user.id } },
      create: { poolId: pool.id, userId: user.id, email: emailForDigest },
      update: { email: emailForDigest, active: true },
    })
  }

  return NextResponse.json({ poolId: pool.id, poolName: pool.name })
}
