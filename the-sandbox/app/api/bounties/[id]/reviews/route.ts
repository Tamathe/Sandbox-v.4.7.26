import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const bounty = await prisma.bounty.findUnique({ where: { id } })
    if (!bounty) return NextResponse.json({ error: 'Bounty not found' }, { status: 404 })

    const body = await req.json()
    const promptUsed = body.promptUsed ? String(body.promptUsed) : null
    const content = String(body.content || '').trim()

    if (!content) {
      return NextResponse.json({ error: 'Review content is required' }, { status: 400 })
    }

    const review = await prisma.bountyReview.create({
      data: {
        bountyId: bounty.id,
        reviewerId: user.id,
        promptUsed,
        content,
      },
      include: {
        reviewer: { select: { id: true, name: true, department: true, role: true } },
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
