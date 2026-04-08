import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const BountyReviewBodySchema = z.object({
  content: z.string().min(1).max(10000),
  promptUsed: z.string().max(2000).optional().nullable(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const bounty = await prisma.bounty.findUnique({ where: { id } })
    if (!bounty) return NextResponse.json({ error: 'Bounty not found' }, { status: 404 })

    const parsedBody = await parseRequestBody(req)
    if ('error' in parsedBody) return parsedBody.error
    const validation = validateBody(BountyReviewBodySchema, parsedBody.data)
    if ('error' in validation) return validation.error
    const { content, promptUsed } = validation.value

    const review = await prisma.bountyReview.create({
      data: {
        bountyId: bounty.id,
        reviewerId: user.id,
        promptUsed: promptUsed ?? null,
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
