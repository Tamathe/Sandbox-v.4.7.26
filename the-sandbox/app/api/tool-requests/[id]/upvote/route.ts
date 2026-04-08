import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { id: requestId } = await params

    // Check that the tool request exists
    const toolRequest = await prisma.toolRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    })
    if (!toolRequest) {
      return NextResponse.json({ error: 'Tool request not found' }, { status: 404 })
    }

    // Toggle upvote — check if already upvoted
    const existing = await prisma.toolRequestUpvote.findUnique({
      where: { requestId_userId: { requestId, userId: auth.user.id } },
    })

    if (existing) {
      // Remove upvote
      await prisma.toolRequestUpvote.delete({ where: { id: existing.id } })
    } else {
      // Add upvote
      await prisma.toolRequestUpvote.create({
        data: { requestId, userId: auth.user.id },
      })
    }

    const count = await prisma.toolRequestUpvote.count({ where: { requestId } })

    return NextResponse.json({ upvoted: !existing, count })
  })
